import { WhatsAppClient } from './WhatsAppClient';
import { CacheService } from '../../cache/CacheService';
import { Logger } from '../../logging/Logger';
import { EventEmitter } from 'events';
import {
  WhatsAppConfig,
  Resident,
  Visitor,
  FortenTemplates,
  IncomingMessage,
  MessageStatus,
  WhatsAppWebhookPayload
} from './types';

export class WhatsAppService extends EventEmitter {
  private readonly logger: Logger;
  private readonly client: WhatsAppClient;
  private messageHandlers: Map<string, (message: IncomingMessage) => Promise<void>> = new Map();
  
  constructor(
    config: WhatsAppConfig,
    private readonly cache: CacheService
  ) {
    super();
    this.logger = new Logger('WhatsAppService');
    this.client = new WhatsAppClient(config);
    
    this.setupDefaultHandlers();
  }

  /**
   * Send access notification to resident
   */
  async sendAccessNotification(resident: Resident, visitor: Visitor): Promise<void> {
    if (!resident.notificationPreferences.whatsapp || !resident.notificationPreferences.visitorsNotifications) {
      this.logger.debug('Resident has disabled WhatsApp notifications', { residentId: resident.id });
      return;
    }
    
    try {
      const components = [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: visitor.name },
            { type: 'text', text: visitor.apartment },
            { type: 'text', text: visitor.pin }
          ]
        }
      ];
      
      // Add image if available
      if (visitor.photo) {
        components.unshift({
          type: 'header',
          parameters: [
            { type: 'image', image: { link: visitor.photo } }
          ]
        });
      }
      
      await this.client.sendTemplate(
        resident.phone,
        'access_notification',
        resident.preferredLanguage || 'es',
        components
      );
      
      // Send interactive buttons for quick actions
      await this.sendAccessActions(resident.phone, visitor);
      
      this.logger.info('Access notification sent', {
        residentId: resident.id,
        visitorId: visitor.id
      });
      
      this.emit('notificationSent', {
        type: 'access_notification',
        resident,
        visitor
      });
    } catch (error) {
      this.logger.error('Failed to send access notification', error);
      this.emit('notificationError', {
        type: 'access_notification',
        resident,
        visitor,
        error
      });
    }
  }

  /**
   * Send visitor arrival notification
   */
  async sendVisitorArrival(resident: Resident, visitorName: string, imageUrl?: string): Promise<void> {
    if (!resident.notificationPreferences.visitorsNotifications) {
      return;
    }
    
    try {
      const components = [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: visitorName }
          ]
        }
      ];
      
      if (imageUrl) {
        components.unshift({
          type: 'header',
          parameters: [
            { type: 'image', image: { link: imageUrl } }
          ]
        });
      }
      
      await this.client.sendTemplate(
        resident.phone,
        'visitor_arrival',
        resident.preferredLanguage || 'es',
        components
      );
      
      // Send quick response buttons
      await this.client.sendButtons(
        resident.phone,
        `¿Desea autorizar el acceso a ${visitorName}?`,
        [
          { id: 'authorize_yes', title: 'Sí, autorizar' },
          { id: 'authorize_no', title: 'No autorizar' },
          { id: 'authorize_call', title: 'Llamarme' }
        ],
        'Autorización de acceso'
      );
    } catch (error) {
      this.logger.error('Failed to send visitor arrival notification', error);
    }
  }

  /**
   * Send delivery notification
   */
  async sendDeliveryNotification(
    resident: Resident,
    courierCompany: string,
    packageDescription: string
  ): Promise<void> {
    if (!resident.notificationPreferences.deliveryNotifications) {
      return;
    }
    
    try {
      await this.client.sendTemplate(
        resident.phone,
        'delivery_notification',
        resident.preferredLanguage || 'es',
        [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: courierCompany },
              { type: 'text', text: packageDescription }
            ]
          }
        ]
      );
    } catch (error) {
      this.logger.error('Failed to send delivery notification', error);
    }
  }

  /**
   * Send emergency alert
   */
  async sendEmergencyAlert(
    resident: Resident,
    alertType: string,
    location: string,
    instructions: string
  ): Promise<void> {
    // Emergency alerts bypass notification preferences
    try {
      await this.client.sendTemplate(
        resident.phone,
        'emergency_alert',
        resident.preferredLanguage || 'es',
        [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: alertType },
              { type: 'text', text: location },
              { type: 'text', text: instructions }
            ]
          }
        ]
      );
      
      // Send location if applicable
      if (location.includes(',')) {
        const [lat, lng] = location.split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          await this.client.sendLocation(
            resident.phone,
            lat,
            lng,
            'Ubicación de emergencia',
            alertType
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to send emergency alert', error);
    }
  }

  /**
   * Send maintenance notice
   */
  async sendMaintenanceNotice(
    resident: Resident,
    serviceType: string,
    date: string,
    time: string,
    duration: string
  ): Promise<void> {
    if (!resident.notificationPreferences.maintenanceNotices) {
      return;
    }
    
    try {
      await this.client.sendTemplate(
        resident.phone,
        'maintenance_notice',
        resident.preferredLanguage || 'es',
        [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: serviceType },
              { type: 'text', text: date },
              { type: 'text', text: time },
              { type: 'text', text: duration }
            ]
          }
        ]
      );
    } catch (error) {
      this.logger.error('Failed to send maintenance notice', error);
    }
  }

  /**
   * Send security alert
   */
  async sendSecurityAlert(
    resident: Resident,
    alertType: string,
    description: string,
    time: string,
    imageUrl?: string
  ): Promise<void> {
    if (!resident.notificationPreferences.securityAlerts) {
      return;
    }
    
    try {
      const components = [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: alertType },
            { type: 'text', text: description },
            { type: 'text', text: time }
          ]
        }
      ];
      
      if (imageUrl) {
        components.unshift({
          type: 'header',
          parameters: [
            { type: 'image', image: { link: imageUrl } }
          ]
        });
      }
      
      await this.client.sendTemplate(
        resident.phone,
        'security_alert',
        resident.preferredLanguage || 'es',
        components
      );
    } catch (error) {
      this.logger.error('Failed to send security alert', error);
    }
  }

  /**
   * Send custom text message
   */
  async sendTextMessage(phone: string, message: string): Promise<void> {
    try {
      await this.client.sendText(phone, message);
    } catch (error) {
      this.logger.error('Failed to send text message', error);
      throw error;
    }
  }

  /**
   * Send image with caption
   */
  async sendImage(phone: string, imageUrl: string, caption?: string): Promise<void> {
    try {
      await this.client.sendImage(phone, imageUrl, caption);
    } catch (error) {
      this.logger.error('Failed to send image', error);
      throw error;
    }
  }

  /**
   * Broadcast message to multiple residents
   */
  async broadcast(
    residents: Resident[],
    messageType: keyof FortenTemplates,
    params: any[]
  ): Promise<{
    sent: number;
    failed: number;
    errors: Array<{ resident: Resident; error: Error }>;
  }> {
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as Array<{ resident: Resident; error: Error }>
    };
    
    // Send in batches to avoid rate limits
    const batchSize = 50;
    const delay = 1000; // 1 second between batches
    
    for (let i = 0; i < residents.length; i += batchSize) {
      const batch = residents.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (resident) => {
          try {
            await this.sendTemplateByType(resident, messageType, params);
            results.sent++;
          } catch (error) {
            results.failed++;
            results.errors.push({ resident, error: error as Error });
          }
        })
      );
      
      // Delay between batches
      if (i + batchSize < residents.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    this.logger.info('Broadcast completed', results);
    
    return results;
  }

  /**
   * Process incoming webhook
   */
  async processWebhook(payload: WhatsAppWebhookPayload): Promise<void> {
    const { messages, statuses } = this.client.processWebhook(payload);
    
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
   * Register message handler
   */
  registerHandler(pattern: string, handler: (message: IncomingMessage) => Promise<void>): void {
    this.messageHandlers.set(pattern, handler);
  }

  // Private methods

  private async sendAccessActions(phone: string, visitor: Visitor): Promise<void> {
    const validityText = `Válido desde ${visitor.validFrom.toLocaleDateString()} hasta ${visitor.validUntil.toLocaleDateString()}`;
    
    await this.client.sendList(
      phone,
      `Acciones disponibles para ${visitor.name}`,
      'Ver opciones',
      [
        {
          title: 'Acciones rápidas',
          rows: [
            {
              id: `extend_access_${visitor.id}`,
              title: 'Extender acceso',
              description: 'Extender validez por 24 horas'
            },
            {
              id: `revoke_access_${visitor.id}`,
              title: 'Revocar acceso',
              description: 'Cancelar acceso inmediatamente'
            },
            {
              id: `view_access_${visitor.id}`,
              title: 'Ver detalles',
              description: validityText
            }
          ]
        }
      ],
      'Gestión de acceso'
    );
  }

  private async sendTemplateByType(
    resident: Resident,
    messageType: keyof FortenTemplates,
    params: any[]
  ): Promise<void> {
    const templateHandlers = {
      access_notification: () => this.sendAccessNotification(resident, params[0]),
      visitor_arrival: () => this.sendVisitorArrival(resident, params[0], params[1]),
      delivery_notification: () => this.sendDeliveryNotification(resident, params[0], params[1]),
      emergency_alert: () => this.sendEmergencyAlert(resident, params[0], params[1], params[2]),
      maintenance_notice: () => this.sendMaintenanceNotice(resident, params[0], params[1], params[2], params[3]),
      security_alert: () => this.sendSecurityAlert(resident, params[0], params[1], params[2], params[3])
    };
    
    const handler = templateHandlers[messageType];
    if (handler) {
      await handler();
    } else {
      throw new Error(`Unknown message type: ${messageType}`);
    }
  }

  private async handleIncomingMessage(message: IncomingMessage): Promise<void> {
    try {
      // Mark as read
      await this.client.markAsRead(message.id);
      
      // Emit raw message event
      this.emit('message', message);
      
      // Store message
      await this.storeMessage(message);
      
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
      this.logger.error('Failed to handle incoming message', error);
    }
  }

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
      case 'view':
        await this.handleViewAccess(message.from, params[1]);
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

  private async handleTextCommand(message: IncomingMessage): Promise<void> {
    const text = message.text?.body.toLowerCase() || '';
    
    // Check for commands
    if (text.startsWith('/')) {
      const [command, ...args] = text.split(' ');
      
      switch (command) {
        case '/ayuda':
        case '/help':
          await this.sendHelpMessage(message.from);
          break;
        case '/estado':
        case '/status':
          await this.sendStatusMessage(message.from);
          break;
        case '/accesos':
          await this.sendActiveAccesses(message.from);
          break;
        default:
          await this.client.sendText(
            message.from,
            'Comando no reconocido. Envía /ayuda para ver los comandos disponibles.'
          );
      }
      
      return;
    }
    
    // Check custom handlers
    for (const [pattern, handler] of this.messageHandlers) {
      if (text.includes(pattern)) {
        await handler(message);
        return;
      }
    }
    
    // Default response
    await this.client.sendText(
      message.from,
      'Gracias por tu mensaje. Un representante te contactará pronto.\n\nPara acciones rápidas, envía /ayuda'
    );
  }

  private async handleAuthorizationResponse(from: string, response: string): Promise<void> {
    switch (response) {
      case 'yes':
        await this.client.sendText(from, '✅ Acceso autorizado. El visitante ha sido notificado.');
        this.emit('accessAuthorized', { from, authorized: true });
        break;
      case 'no':
        await this.client.sendText(from, '❌ Acceso denegado. El visitante ha sido notificado.');
        this.emit('accessAuthorized', { from, authorized: false });
        break;
      case 'call':
        await this.client.sendText(from, '📞 Un operador se comunicará con usted en breve.');
        this.emit('callbackRequested', { from });
        break;
    }
  }

  private async handleExtendAccess(from: string, visitorId: string): Promise<void> {
    // This would integrate with your access control system
    await this.client.sendText(
      from,
      '✅ El acceso ha sido extendido por 24 horas adicionales.'
    );
    
    this.emit('accessExtended', { from, visitorId });
  }

  private async handleRevokeAccess(from: string, visitorId: string): Promise<void> {
    // This would integrate with your access control system
    await this.client.sendText(
      from,
      '❌ El acceso ha sido revocado inmediatamente.'
    );
    
    this.emit('accessRevoked', { from, visitorId });
  }

  private async handleViewAccess(from: string, visitorId: string): Promise<void> {
    // This would fetch actual visitor details
    await this.client.sendText(
      from,
      'Detalles del acceso:\n\n' +
      '👤 Visitante: Juan Pérez\n' +
      '🏢 Apartamento: 501\n' +
      '🔑 PIN: 1234\n' +
      '📅 Válido: 01/01/2024 - 02/01/2024\n' +
      '🚗 Vehículo: ABC 1234'
    );
  }

  private async sendHelpMessage(to: string): Promise<void> {
    await this.client.sendText(
      to,
      '*Comandos disponibles:*\n\n' +
      '/ayuda - Muestra este mensaje\n' +
      '/estado - Estado del edificio\n' +
      '/accesos - Ver accesos activos\n' +
      '/emergencia - Reportar emergencia\n\n' +
      '*Para soporte:*\n' +
      'Envía cualquier mensaje y un operador te contactará.'
    );
  }

  private async sendStatusMessage(to: string): Promise<void> {
    // This would fetch actual building status
    await this.client.sendText(
      to,
      '*Estado del edificio:*\n\n' +
      '✅ Portería: Operativa\n' +
      '✅ Cámaras: 12/12 activas\n' +
      '✅ Accesos: Funcionando\n' +
      '🔧 Ascensor 2: En mantenimiento\n\n' +
      'Última actualización: hace 5 minutos'
    );
  }

  private async sendActiveAccesses(to: string): Promise<void> {
    // This would fetch actual active accesses
    await this.client.sendButtons(
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

  private handleMessageStatus(status: MessageStatus): void {
    this.emit('messageStatus', status);
    
    if (status.status === 'failed' && status.errors) {
      this.logger.error('Message delivery failed', {
        messageId: status.id,
        recipient: status.recipient_id,
        errors: status.errors
      });
    }
  }

  private async storeMessage(message: IncomingMessage): Promise<void> {
    try {
      // Store in cache for quick access
      const key = `whatsapp:messages:${message.from}`;
      const messages = await this.cache.get(key, 'messages') || [];
      
      messages.unshift({
        ...message,
        stored_at: new Date()
      });
      
      // Keep last 50 messages
      if (messages.length > 50) {
        messages.splice(50);
      }
      
      await this.cache.set(key, messages, {
        ttl: 86400, // 24 hours
        namespace: 'messages'
      });
    } catch (error) {
      this.logger.error('Failed to store message', error);
    }
  }

  private setupDefaultHandlers(): void {
    // Emergency handler
    this.registerHandler('emergencia', async (message) => {
      await this.client.sendText(
        message.from,
        '🚨 EMERGENCIA RECIBIDA\n\n' +
        'Tu mensaje ha sido enviado al equipo de seguridad.\n' +
        'Un operador te contactará inmediatamente.\n\n' +
        'Si es una emergencia médica, llama al 911.'
      );
      
      this.emit('emergency', {
        from: message.from,
        message: message.text?.body,
        timestamp: new Date(parseInt(message.timestamp) * 1000)
      });
    });
  }
}