import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import { Logger } from '../../logging/Logger';
import {
  WhatsAppConfig,
  WhatsAppMessage,
  WhatsAppTextMessage,
  WhatsAppTemplateMessage,
  WhatsAppImageMessage,
  WhatsAppLocationMessage,
  WhatsAppInteractiveMessage,
  WhatsAppWebhookPayload,
  SendMessageResponse,
  UploadMediaResponse,
  MediaUrlResponse,
  IncomingMessage,
  MessageStatus
} from './types';

export class WhatsAppClient {
  private readonly logger: Logger;
  private readonly client: AxiosInstance;
  
  constructor(private readonly config: WhatsAppConfig) {
    this.logger = new Logger('WhatsAppClient');
    
    this.client = axios.create({
      baseURL: `${config.apiUrl}/${config.apiVersion}`,
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    this.setupInterceptors();
  }

  /**
   * Send a text message
   */
  async sendText(to: string, text: string, previewUrl: boolean = false): Promise<SendMessageResponse> {
    const message: WhatsAppTextMessage = {
      to: this.formatPhoneNumber(to),
      type: 'text',
      content: {
        body: text,
        preview_url: previewUrl
      }
    };
    
    return this.sendMessage(message);
  }

  /**
   * Send a template message
   */
  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string = 'es',
    components?: any[]
  ): Promise<SendMessageResponse> {
    const message: WhatsAppTemplateMessage = {
      to: this.formatPhoneNumber(to),
      type: 'template',
      content: {
        name: templateName,
        language: {
          code: languageCode
        },
        components
      }
    };
    
    return this.sendMessage(message);
  }

  /**
   * Send an image message
   */
  async sendImage(
    to: string,
    imageUrl: string,
    caption?: string
  ): Promise<SendMessageResponse> {
    const message: WhatsAppImageMessage = {
      to: this.formatPhoneNumber(to),
      type: 'image',
      content: {
        image: {
          link: imageUrl,
          caption
        }
      }
    };
    
    return this.sendMessage(message);
  }

  /**
   * Send a location message
   */
  async sendLocation(
    to: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string
  ): Promise<SendMessageResponse> {
    const message: WhatsAppLocationMessage = {
      to: this.formatPhoneNumber(to),
      type: 'location',
      content: {
        location: {
          latitude,
          longitude,
          name,
          address
        }
      }
    };
    
    return this.sendMessage(message);
  }

  /**
   * Send an interactive button message
   */
  async sendButtons(
    to: string,
    body: string,
    buttons: Array<{ id: string; title: string }>,
    header?: string,
    footer?: string
  ): Promise<SendMessageResponse> {
    const message: WhatsAppInteractiveMessage = {
      to: this.formatPhoneNumber(to),
      type: 'interactive',
      content: {
        type: 'button',
        header: header ? { type: 'text', text: header } : undefined,
        body: { text: body },
        footer: footer ? { text: footer } : undefined,
        action: {
          buttons: buttons.map(btn => ({
            type: 'reply' as const,
            reply: {
              id: btn.id,
              title: btn.title
            }
          }))
        }
      }
    };
    
    return this.sendMessage(message);
  }

  /**
   * Send an interactive list message
   */
  async sendList(
    to: string,
    body: string,
    buttonText: string,
    sections: Array<{
      title?: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>,
    header?: string,
    footer?: string
  ): Promise<SendMessageResponse> {
    const message: WhatsAppInteractiveMessage = {
      to: this.formatPhoneNumber(to),
      type: 'interactive',
      content: {
        type: 'list',
        header: header ? { type: 'text', text: header } : undefined,
        body: { text: body },
        footer: footer ? { text: footer } : undefined,
        action: {
          button: buttonText,
          sections
        }
      }
    };
    
    return this.sendMessage(message);
  }

  /**
   * Upload media file
   */
  async uploadMedia(filePath: string, mimeType: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('messaging_product', 'whatsapp');
      formData.append('file', require('fs').createReadStream(filePath), {
        contentType: mimeType
      });
      
      const response = await this.client.post<UploadMediaResponse>(
        `/${this.config.phoneNumberId}/media`,
        formData,
        {
          headers: formData.getHeaders()
        }
      );
      
      return response.data.id;
    } catch (error) {
      this.logger.error('Failed to upload media', error);
      throw error;
    }
  }

  /**
   * Get media URL
   */
  async getMediaUrl(mediaId: string): Promise<MediaUrlResponse> {
    try {
      const response = await this.client.get<MediaUrlResponse>(`/${mediaId}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get media URL', error);
      throw error;
    }
  }

  /**
   * Download media file
   */
  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    try {
      const response = await axios.get(mediaUrl, {
        responseType: 'arraybuffer',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`
        }
      });
      
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error('Failed to download media', error);
      throw error;
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      await this.client.post(`/${this.config.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      });
    } catch (error) {
      this.logger.error('Failed to mark message as read', error);
    }
  }

  /**
   * Process webhook payload
   */
  processWebhook(payload: WhatsAppWebhookPayload): {
    messages: IncomingMessage[];
    statuses: MessageStatus[];
  } {
    const messages: IncomingMessage[] = [];
    const statuses: MessageStatus[] = [];
    
    payload.entry.forEach(entry => {
      entry.changes.forEach(change => {
        if (change.value.messages) {
          messages.push(...change.value.messages);
        }
        if (change.value.statuses) {
          statuses.push(...change.value.statuses);
        }
      });
    });
    
    return { messages, statuses };
  }

  /**
   * Verify webhook signature
   */
  verifyWebhook(signature: string, body: string): boolean {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.config.verifyToken)
      .update(body)
      .digest('hex');
    
    return signature === `sha256=${expectedSignature}`;
  }

  /**
   * Get business profile
   */
  async getBusinessProfile(): Promise<any> {
    try {
      const response = await this.client.get(
        `/accounts/${this.config.businessAccountId}/phone_numbers/${this.config.phoneNumberId}`
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get business profile', error);
      throw error;
    }
  }

  /**
   * Update business profile
   */
  async updateBusinessProfile(profile: {
    about?: string;
    address?: string;
    description?: string;
    email?: string;
    profile_picture_handle?: string;
    websites?: string[];
  }): Promise<void> {
    try {
      await this.client.post(`/${this.config.phoneNumberId}/whatsapp_business_profile`, {
        messaging_product: 'whatsapp',
        ...profile
      });
    } catch (error) {
      this.logger.error('Failed to update business profile', error);
      throw error;
    }
  }

  // Private methods

  private async sendMessage(message: WhatsAppMessage): Promise<SendMessageResponse> {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: message.to,
        type: message.type,
        [message.type]: message.content
      };
      
      const response = await this.client.post<SendMessageResponse>(
        `/${this.config.phoneNumberId}/messages`,
        payload
      );
      
      this.logger.debug('Message sent successfully', {
        to: message.to,
        type: message.type,
        messageId: response.data.messages[0]?.id
      });
      
      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to send message', error.response?.data || error);
      throw this.handleError(error);
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Add country code if not present (Uruguay)
    if (!cleaned.startsWith('598')) {
      cleaned = '598' + cleaned;
    }
    
    return cleaned;
  }

  private setupInterceptors(): void {
    // Request logging
    this.client.interceptors.request.use(
      (config) => {
        this.logger.debug('WhatsApp API request', {
          method: config.method,
          url: config.url,
          data: config.data
        });
        return config;
      },
      (error) => {
        this.logger.error('WhatsApp API request error', error);
        return Promise.reject(error);
      }
    );
    
    // Response logging
    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug('WhatsApp API response', {
          status: response.status,
          data: response.data
        });
        return response;
      },
      (error) => {
        this.logger.error('WhatsApp API response error', {
          status: error.response?.status,
          data: error.response?.data
        });
        return Promise.reject(error);
      }
    );
  }

  private handleError(error: any): Error {
    if (error.response?.data?.error) {
      const apiError = error.response.data.error;
      return new Error(`WhatsApp API Error: ${apiError.message} (${apiError.code})`);
    }
    
    return error;
  }
}