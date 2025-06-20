/**
 * WhatsApp Conversation Service
 * Handles conversations and message management
 */

import { EventEmitter } from 'events';
import { whatsAppClient } from './client.service';
import { WHATSAPP_CONFIG } from './config';
import {
  IncomingMessage,
  MessageStatus,
  WebhookPayload,
  Conversation,
  ConversationContact,
  ConversationMessage,
  MessageType
} from './types';

export class WhatsAppConversationService extends EventEmitter {
  private conversations: Map<string, Conversation> = new Map();
  private messageHandlers: Map<string, (message: IncomingMessage) => Promise<void>> = new Map();
  private wsConnection: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    super();
    this.setupDefaultHandlers();
    this.connectWebSocket();
  }

  /**
   * Connect to WebSocket for real-time messages
   */
  private connectWebSocket(): void {
    try {
      this.wsConnection = new WebSocket(WHATSAPP_CONFIG.WEBSOCKET_URL);

      this.wsConnection.onopen = () => {
        console.log('WhatsApp WebSocket connected');
        this.reconnectAttempts = 0;
        this.emit('connected');
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'webhook') {
            this.processWebhook(data.payload);
          }
        } catch (error) {
          console.error('Failed to process WebSocket message:', error);
        }
      };

      this.wsConnection.onerror = (error) => {
        console.error('WhatsApp WebSocket error:', error);
        this.emit('error', error);
      };

      this.wsConnection.onclose = () => {
        console.log('WhatsApp WebSocket disconnected');
        this.emit('disconnected');
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.attemptReconnect();
    }
  }

  /**
   * Attempt to reconnect WebSocket
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('reconnectFailed');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    this.reconnectTimer = setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      this.connectWebSocket();
    }, delay);
  }

  /**
   * Process webhook payload
   */
  async processWebhook(payload: WebhookPayload): Promise<void> {
    const { messages, statuses } = whatsAppClient.processWebhook(payload);

    // Process incoming messages
    for (const message of messages) {
      await this.handleIncomingMessage(message);
    }

    // Process message statuses
    for (const status of statuses) {
      this.handleMessageStatus(status);
    }
  }

  /**
   * Get all conversations
   */
  getConversations(): Conversation[] {
    return Array.from(this.conversations.values())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Get active conversations
   */
  getActiveConversations(): Conversation[] {
    return this.getConversations().filter(conv => conv.status === 'active');
  }

  /**
   * Get conversation by contact ID
   */
  getConversation(contactId: string): Conversation | undefined {
    return this.conversations.get(contactId);
  }

  /**
   * Get or create conversation
   */
  private getOrCreateConversation(contactId: string, contactName?: string): Conversation {
    let conversation = this.conversations.get(contactId);
    
    if (!conversation) {
      conversation = {
        id: contactId,
        contact: {
          wa_id: contactId,
          name: contactName || contactId,
          phone: contactId,
          isBlocked: false
        },
        messages: [],
        unreadCount: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      this.conversations.set(contactId, conversation);
      this.emit('conversationCreated', conversation);
    }
    
    return conversation;
  }

  /**
   * Send message
   */
  async sendMessage(
    contactId: string,
    text: string,
    replyToMessageId?: string
  ): Promise<void> {
    try {
      const response = replyToMessageId
        ? await whatsAppClient.replyToMessage(replyToMessageId, contactId, text)
        : await whatsAppClient.sendText(contactId, text);

      const conversation = this.getOrCreateConversation(contactId);
      const message: ConversationMessage = {
        id: response.messages[0].id,
        conversationId: conversation.id,
        type: 'text',
        direction: 'outbound',
        status: 'sent',
        content: { text },
        timestamp: new Date()
      };

      this.addMessageToConversation(conversation, message);
      this.emit('messageSent', message);
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Send image
   */
  async sendImage(
    contactId: string,
    imageUrl: string,
    caption?: string
  ): Promise<void> {
    try {
      const response = await whatsAppClient.sendImage(contactId, imageUrl, caption);
      
      const conversation = this.getOrCreateConversation(contactId);
      const message: ConversationMessage = {
        id: response.messages[0].id,
        conversationId: conversation.id,
        type: 'image',
        direction: 'outbound',
        status: 'sent',
        content: { imageUrl, caption },
        timestamp: new Date()
      };

      this.addMessageToConversation(conversation, message);
      this.emit('messageSent', message);
    } catch (error) {
      console.error('Failed to send image:', error);
      throw error;
    }
  }

  /**
   * Send document
   */
  async sendDocument(
    contactId: string,
    documentUrl: string,
    filename?: string,
    caption?: string
  ): Promise<void> {
    try {
      const response = await whatsAppClient.sendDocument(contactId, documentUrl, filename, caption);
      
      const conversation = this.getOrCreateConversation(contactId);
      const message: ConversationMessage = {
        id: response.messages[0].id,
        conversationId: conversation.id,
        type: 'document',
        direction: 'outbound',
        status: 'sent',
        content: { documentUrl, filename, caption },
        timestamp: new Date()
      };

      this.addMessageToConversation(conversation, message);
      this.emit('messageSent', message);
    } catch (error) {
      console.error('Failed to send document:', error);
      throw error;
    }
  }

  /**
   * Send location
   */
  async sendLocation(
    contactId: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string
  ): Promise<void> {
    try {
      const response = await whatsAppClient.sendLocation(contactId, latitude, longitude, name, address);
      
      const conversation = this.getOrCreateConversation(contactId);
      const message: ConversationMessage = {
        id: response.messages[0].id,
        conversationId: conversation.id,
        type: 'location',
        direction: 'outbound',
        status: 'sent',
        content: { latitude, longitude, name, address },
        timestamp: new Date()
      };

      this.addMessageToConversation(conversation, message);
      this.emit('messageSent', message);
    } catch (error) {
      console.error('Failed to send location:', error);
      throw error;
    }
  }

  /**
   * Mark conversation as read
   */
  async markAsRead(conversationId: string): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return;

    conversation.unreadCount = 0;
    
    // Mark last message as read
    const lastMessage = conversation.lastMessage;
    if (lastMessage && lastMessage.direction === 'inbound') {
      await whatsAppClient.markAsRead(lastMessage.id);
    }

    this.emit('conversationRead', conversation);
  }

  /**
   * Archive conversation
   */
  archiveConversation(conversationId: string): void {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.status = 'archived';
      this.emit('conversationArchived', conversation);
    }
  }

  /**
   * Unarchive conversation
   */
  unarchiveConversation(conversationId: string): void {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.status = 'active';
      this.emit('conversationUnarchived', conversation);
    }
  }

  /**
   * Block contact
   */
  blockContact(contactId: string): void {
    const conversation = this.conversations.get(contactId);
    if (conversation) {
      conversation.contact.isBlocked = true;
      this.emit('contactBlocked', conversation.contact);
    }
  }

  /**
   * Unblock contact
   */
  unblockContact(contactId: string): void {
    const conversation = this.conversations.get(contactId);
    if (conversation) {
      conversation.contact.isBlocked = false;
      this.emit('contactUnblocked', conversation.contact);
    }
  }

  /**
   * Search conversations
   */
  searchConversations(query: string): Conversation[] {
    const searchLower = query.toLowerCase();
    
    return this.getConversations().filter(conv => {
      // Search in contact name
      if (conv.contact.name.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Search in messages
      return conv.messages.some(msg => {
        if (msg.type === 'text' && msg.content.text) {
          return msg.content.text.toLowerCase().includes(searchLower);
        }
        return false;
      });
    });
  }

  /**
   * Add tag to conversation
   */
  addTag(conversationId: string, tag: string): void {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      if (!conversation.labels) {
        conversation.labels = [];
      }
      if (!conversation.labels.includes(tag)) {
        conversation.labels.push(tag);
        this.emit('conversationTagged', { conversation, tag });
      }
    }
  }

  /**
   * Remove tag from conversation
   */
  removeTag(conversationId: string, tag: string): void {
    const conversation = this.conversations.get(conversationId);
    if (conversation && conversation.labels) {
      const index = conversation.labels.indexOf(tag);
      if (index > -1) {
        conversation.labels.splice(index, 1);
        this.emit('conversationUntagged', { conversation, tag });
      }
    }
  }

  /**
   * Register message handler
   */
  registerHandler(pattern: string, handler: (message: IncomingMessage) => Promise<void>): void {
    this.messageHandlers.set(pattern, handler);
  }

  /**
   * Handle incoming message
   */
  private async handleIncomingMessage(message: IncomingMessage): Promise<void> {
    try {
      // Mark as read
      await whatsAppClient.markAsRead(message.id);

      // Get or create conversation
      const conversation = this.getOrCreateConversation(message.from);

      // Create conversation message
      const conversationMessage: ConversationMessage = {
        id: message.id,
        conversationId: conversation.id,
        type: message.type,
        direction: 'inbound',
        content: this.extractMessageContent(message),
        timestamp: new Date(parseInt(message.timestamp) * 1000)
      };

      // Add to conversation
      this.addMessageToConversation(conversation, conversationMessage);
      
      // Increment unread count
      conversation.unreadCount++;

      // Emit events
      this.emit('messageReceived', conversationMessage);
      this.emit('message', message);

      // Handle interactive responses
      if (message.interactive) {
        await this.handleInteractiveResponse(message);
        return;
      }

      // Handle text commands
      if (message.text) {
        await this.handleTextCommand(message);
      }
    } catch (error) {
      console.error('Failed to handle incoming message:', error);
    }
  }

  /**
   * Extract message content
   */
  private extractMessageContent(message: IncomingMessage): any {
    switch (message.type) {
      case 'text':
        return { text: message.text?.body };
      case 'image':
        return { 
          imageId: message.image?.id,
          caption: message.image?.caption,
          mimeType: message.image?.mime_type
        };
      case 'document':
        return {
          documentId: message.document?.id,
          filename: message.document?.filename,
          caption: message.document?.caption,
          mimeType: message.document?.mime_type
        };
      case 'video':
        return {
          videoId: message.video?.id,
          caption: message.video?.caption,
          mimeType: message.video?.mime_type
        };
      case 'audio':
        return {
          audioId: message.audio?.id,
          mimeType: message.audio?.mime_type,
          isVoice: message.audio?.voice
        };
      case 'location':
        return message.location;
      default:
        return { raw: message };
    }
  }

  /**
   * Add message to conversation
   */
  private addMessageToConversation(conversation: Conversation, message: ConversationMessage): void {
    conversation.messages.push(message);
    conversation.lastMessage = message;
    conversation.updatedAt = new Date();
    
    // Keep only last 100 messages in memory
    if (conversation.messages.length > 100) {
      conversation.messages = conversation.messages.slice(-100);
    }
    
    this.emit('conversationUpdated', conversation);
  }

  /**
   * Handle message status update
   */
  private handleMessageStatus(status: MessageStatus): void {
    // Find conversation and update message status
    for (const conversation of this.conversations.values()) {
      const message = conversation.messages.find(msg => msg.id === status.id);
      if (message) {
        message.status = status.status;
        this.emit('messageStatusUpdated', { message, status: status.status });
        break;
      }
    }

    this.emit('messageStatus', status);

    if (status.status === 'failed' && status.errors) {
      console.error('Message delivery failed:', {
        messageId: status.id,
        recipient: status.recipient_id,
        errors: status.errors
      });
    }
  }

  /**
   * Handle interactive response
   */
  private async handleInteractiveResponse(message: IncomingMessage): Promise<void> {
    const response = message.interactive?.button_reply || message.interactive?.list_reply;
    if (!response) return;

    const [action, ...params] = response.id.split('_');

    switch (action) {
      case 'authorize':
        await this.handleAuthorizationResponse(message.from, params[0]);
        break;
      case 'extend':
        await this.handleExtendAccess(message.from, params[1]);
        break;
      case 'revoke':
        await this.handleRevokeAccess(message.from, params[1]);
        break;
      case 'delivery':
        await this.handleDeliveryResponse(message.from, params[0]);
        break;
      default:
        // Check custom handlers
        for (const [pattern, handler] of this.messageHandlers) {
          if (response.id.startsWith(pattern)) {
            await handler(message);
            return;
          }
        }
    }
  }

  /**
   * Handle text command
   */
  private async handleTextCommand(message: IncomingMessage): Promise<void> {
    const text = message.text?.body.toLowerCase() || '';

    // Check for commands
    for (const [commandList, commandName] of Object.entries(WHATSAPP_CONFIG.COMMANDS)) {
      if (commandList.some(cmd => text.startsWith(cmd))) {
        await this.handleCommand(message.from, commandName as keyof typeof WHATSAPP_CONFIG.COMMANDS, text);
        return;
      }
    }

    // Check custom handlers
    for (const [pattern, handler] of this.messageHandlers) {
      if (text.includes(pattern)) {
        await handler(message);
        return;
      }
    }

    // Default response
    await whatsAppClient.sendText(
      message.from,
      'Gracias por tu mensaje. Un representante te contactará pronto.\n\nPara acciones rápidas, envía /ayuda'
    );
  }

  /**
   * Handle command
   */
  private async handleCommand(from: string, command: keyof typeof WHATSAPP_CONFIG.COMMANDS, text: string): Promise<void> {
    switch (command) {
      case 'HELP':
        await this.sendHelpMessage(from);
        break;
      case 'STATUS':
        await this.sendStatusMessage(from);
        break;
      case 'ACCESS':
        await this.sendActiveAccesses(from);
        break;
      case 'EMERGENCY':
        await this.handleEmergency(from, text);
        break;
      case 'SUPPORT':
        await this.sendSupportOptions(from);
        break;
      case 'NOTIFICATIONS':
        await this.sendNotificationSettings(from);
        break;
    }
  }

  /**
   * Handle authorization response
   */
  private async handleAuthorizationResponse(from: string, response: string): Promise<void> {
    switch (response) {
      case 'yes':
        await whatsAppClient.sendText(from, '✅ Acceso autorizado. El visitante ha sido notificado.');
        this.emit('accessAuthorized', { from, authorized: true });
        break;
      case 'no':
        await whatsAppClient.sendText(from, '❌ Acceso denegado. El visitante ha sido notificado.');
        this.emit('accessAuthorized', { from, authorized: false });
        break;
      case 'call':
        await whatsAppClient.sendText(from, '📞 Un operador se comunicará con usted en breve.');
        this.emit('callbackRequested', { from });
        break;
    }
  }

  /**
   * Handle delivery response
   */
  private async handleDeliveryResponse(from: string, response: string): Promise<void> {
    switch (response) {
      case 'receive':
        await whatsAppClient.sendText(from, '✅ Paquete autorizado para recepción.');
        this.emit('deliveryAuthorized', { from, action: 'receive' });
        break;
      case 'reject':
        await whatsAppClient.sendText(from, '❌ Paquete rechazado.');
        this.emit('deliveryAuthorized', { from, action: 'reject' });
        break;
      case 'leave':
        await whatsAppClient.sendText(from, '📦 El paquete será dejado en portería.');
        this.emit('deliveryAuthorized', { from, action: 'leave' });
        break;
    }
  }

  /**
   * Handle extend access
   */
  private async handleExtendAccess(from: string, visitorId: string): Promise<void> {
    await whatsAppClient.sendText(
      from,
      '✅ El acceso ha sido extendido por 24 horas adicionales.'
    );
    
    this.emit('accessExtended', { from, visitorId });
  }

  /**
   * Handle revoke access
   */
  private async handleRevokeAccess(from: string, visitorId: string): Promise<void> {
    await whatsAppClient.sendText(
      from,
      '❌ El acceso ha sido revocado inmediatamente.'
    );
    
    this.emit('accessRevoked', { from, visitorId });
  }

  /**
   * Handle emergency
   */
  private async handleEmergency(from: string, text: string): Promise<void> {
    await whatsAppClient.sendText(
      from,
      '🚨 EMERGENCIA RECIBIDA\n\n' +
      'Tu mensaje ha sido enviado al equipo de seguridad.\n' +
      'Un operador te contactará inmediatamente.\n\n' +
      'Si es una emergencia médica, llama al 911.'
    );
    
    this.emit('emergency', {
      from,
      message: text,
      timestamp: new Date()
    });
  }

  /**
   * Send help message
   */
  private async sendHelpMessage(to: string): Promise<void> {
    await whatsAppClient.sendText(
      to,
      '*Comandos disponibles:*\n\n' +
      '/ayuda - Muestra este mensaje\n' +
      '/estado - Estado del edificio\n' +
      '/accesos - Ver accesos activos\n' +
      '/emergencia - Reportar emergencia\n' +
      '/soporte - Opciones de soporte\n' +
      '/notificaciones - Configurar notificaciones\n\n' +
      '*Para asistencia:*\n' +
      'Envía cualquier mensaje y un operador te contactará.'
    );
  }

  /**
   * Send status message
   */
  private async sendStatusMessage(to: string): Promise<void> {
    await whatsAppClient.sendText(
      to,
      '*Estado del edificio:*\n\n' +
      '✅ Portería: Operativa\n' +
      '✅ Cámaras: 12/12 activas\n' +
      '✅ Accesos: Funcionando\n' +
      '🔧 Ascensor 2: En mantenimiento\n\n' +
      'Última actualización: hace 5 minutos'
    );
  }

  /**
   * Send active accesses
   */
  private async sendActiveAccesses(to: string): Promise<void> {
    await whatsAppClient.sendButtons(
      to,
      'Tienes 3 accesos activos',
      [
        { id: 'access_detail_1', title: 'Juan Pérez (Hoy)' },
        { id: 'access_detail_2', title: 'Delivery Pedidos Ya' },
        { id: 'access_detail_3', title: 'María García (3 días)' }
      ],
      'Accesos activos',
      'Selecciona uno para ver detalles'
    );
  }

  /**
   * Send support options
   */
  private async sendSupportOptions(to: string): Promise<void> {
    await whatsAppClient.sendList(
      to,
      'Seleccione el tipo de soporte que necesita',
      'Ver opciones',
      [WHATSAPP_CONFIG.LIST_SECTIONS.SUPPORT_OPTIONS],
      'Soporte FORTEN'
    );
  }

  /**
   * Send notification settings
   */
  private async sendNotificationSettings(to: string): Promise<void> {
    await whatsAppClient.sendText(
      to,
      '*Configuración de notificaciones:*\n\n' +
      '✅ Visitantes\n' +
      '✅ Entregas\n' +
      '❌ Mantenimiento\n' +
      '✅ Alertas de seguridad\n' +
      '❌ Recordatorios de pago\n\n' +
      'Para cambiar la configuración, accede a la app móvil o contacta a soporte.'
    );
  }

  /**
   * Setup default handlers
   */
  private setupDefaultHandlers(): void {
    // Emergency handler
    this.registerHandler('emergencia', async (message) => {
      await this.handleEmergency(message.from, message.text?.body || '');
    });

    // Support handler
    this.registerHandler('soporte', async (message) => {
      await this.sendSupportOptions(message.from);
    });
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.conversations.clear();
    this.messageHandlers.clear();
    this.removeAllListeners();
  }
}

// Export singleton instance
export const whatsAppConversationService = new WhatsAppConversationService();