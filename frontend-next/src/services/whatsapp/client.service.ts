/**
 * WhatsApp Business API Client Service
 * Handles communication with WhatsApp Business API
 */

import axios, { AxiosInstance } from 'axios';
import { WHATSAPP_CONFIG, MESSAGE_TYPES } from './config';
import {
  WhatsAppMessage,
  TextMessage,
  ImageMessage,
  DocumentMessage,
  VideoMessage,
  AudioMessage,
  LocationMessage,
  TemplateMessage,
  InteractiveMessage,
  ButtonInteractive,
  ListInteractive,
  SendMessageResponse,
  UploadMediaResponse,
  MediaUrlResponse,
  BusinessProfile,
  Contact,
  IncomingMessage,
  MessageStatus,
  WebhookPayload
} from './types';

export class WhatsAppClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${WHATSAPP_CONFIG.API_URL}/${WHATSAPP_CONFIG.API_VERSION}`,
      headers: {
        'Authorization': `Bearer ${WHATSAPP_CONFIG.ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  /**
   * Send text message
   */
  async sendText(to: string, text: string, previewUrl: boolean = false): Promise<SendMessageResponse> {
    const message: TextMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: MESSAGE_TYPES.TEXT,
      text: {
        body: text,
        preview_url: previewUrl
      }
    };

    return this.sendMessage(message);
  }

  /**
   * Send image message
   */
  async sendImage(to: string, imageUrl: string, caption?: string): Promise<SendMessageResponse> {
    const message: ImageMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: MESSAGE_TYPES.IMAGE,
      image: {
        link: imageUrl,
        caption
      }
    };

    return this.sendMessage(message);
  }

  /**
   * Send document message
   */
  async sendDocument(
    to: string,
    documentUrl: string,
    filename?: string,
    caption?: string
  ): Promise<SendMessageResponse> {
    const message: DocumentMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: MESSAGE_TYPES.DOCUMENT,
      document: {
        link: documentUrl,
        filename,
        caption
      }
    };

    return this.sendMessage(message);
  }

  /**
   * Send video message
   */
  async sendVideo(to: string, videoUrl: string, caption?: string): Promise<SendMessageResponse> {
    const message: VideoMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: MESSAGE_TYPES.VIDEO,
      video: {
        link: videoUrl,
        caption
      }
    };

    return this.sendMessage(message);
  }

  /**
   * Send audio message
   */
  async sendAudio(to: string, audioUrl: string): Promise<SendMessageResponse> {
    const message: AudioMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: MESSAGE_TYPES.AUDIO,
      audio: {
        link: audioUrl
      }
    };

    return this.sendMessage(message);
  }

  /**
   * Send location message
   */
  async sendLocation(
    to: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string
  ): Promise<SendMessageResponse> {
    const message: LocationMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: MESSAGE_TYPES.LOCATION,
      location: {
        latitude,
        longitude,
        name,
        address
      }
    };

    return this.sendMessage(message);
  }

  /**
   * Send template message
   */
  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string = 'es',
    components?: TemplateMessage['template']['components']
  ): Promise<SendMessageResponse> {
    const message: TemplateMessage = {
      messaging_product: 'whatsapp',
      to: this.formatPhoneNumber(to),
      type: MESSAGE_TYPES.TEMPLATE,
      template: {
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
   * Send interactive button message
   */
  async sendButtons(
    to: string,
    body: string,
    buttons: Array<{ id: string; title: string }>,
    header?: string,
    footer?: string
  ): Promise<SendMessageResponse> {
    const interactive: ButtonInteractive = {
      type: 'button',
      body: { text: body },
      action: {
        buttons: buttons.map(btn => ({
          type: 'reply',
          reply: {
            id: btn.id,
            title: btn.title
          }
        }))
      }
    };

    if (header) {
      interactive.header = { type: 'text', text: header };
    }

    if (footer) {
      interactive.footer = { text: footer };
    }

    const message: InteractiveMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: MESSAGE_TYPES.INTERACTIVE,
      interactive
    };

    return this.sendMessage(message);
  }

  /**
   * Send interactive list message
   */
  async sendList(
    to: string,
    body: string,
    buttonText: string,
    sections: ListInteractive['action']['sections'],
    header?: string,
    footer?: string
  ): Promise<SendMessageResponse> {
    const interactive: ListInteractive = {
      type: 'list',
      body: { text: body },
      action: {
        button: buttonText,
        sections
      }
    };

    if (header) {
      interactive.header = { type: 'text', text: header };
    }

    if (footer) {
      interactive.footer = { text: footer };
    }

    const message: InteractiveMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: MESSAGE_TYPES.INTERACTIVE,
      interactive
    };

    return this.sendMessage(message);
  }

  /**
   * Upload media file
   */
  async uploadMedia(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('file', file);

    try {
      const response = await this.client.post<UploadMediaResponse>(
        `/${WHATSAPP_CONFIG.PHONE_NUMBER_ID}/media`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return response.data.id;
    } catch (error) {
      console.error('Failed to upload media:', error);
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
      console.error('Failed to get media URL:', error);
      throw error;
    }
  }

  /**
   * Download media file
   */
  async downloadMedia(mediaUrl: string): Promise<Blob> {
    try {
      const response = await axios.get(mediaUrl, {
        responseType: 'blob',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_CONFIG.ACCESS_TOKEN}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Failed to download media:', error);
      throw error;
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      await this.client.post(`/${WHATSAPP_CONFIG.PHONE_NUMBER_ID}/messages`, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      });
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  }

  /**
   * Get business profile
   */
  async getBusinessProfile(): Promise<BusinessProfile> {
    try {
      const response = await this.client.get<BusinessProfile>(
        `/${WHATSAPP_CONFIG.PHONE_NUMBER_ID}/whatsapp_business_profile`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get business profile:', error);
      throw error;
    }
  }

  /**
   * Update business profile
   */
  async updateBusinessProfile(profile: Partial<BusinessProfile>): Promise<void> {
    try {
      await this.client.post(`/${WHATSAPP_CONFIG.PHONE_NUMBER_ID}/whatsapp_business_profile`, {
        messaging_product: 'whatsapp',
        ...profile
      });
    } catch (error) {
      console.error('Failed to update business profile:', error);
      throw error;
    }
  }

  /**
   * Process webhook payload
   */
  processWebhook(payload: WebhookPayload): {
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
      .createHmac('sha256', WHATSAPP_CONFIG.VERIFY_TOKEN)
      .update(body)
      .digest('hex');

    return signature === `sha256=${expectedSignature}`;
  }

  /**
   * Reply to message
   */
  async replyToMessage(
    messageId: string,
    to: string,
    text: string
  ): Promise<SendMessageResponse> {
    const message: TextMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: MESSAGE_TYPES.TEXT,
      context: {
        message_id: messageId
      },
      text: {
        body: text
      }
    };

    return this.sendMessage(message);
  }

  // Private methods

  private async sendMessage(message: WhatsAppMessage): Promise<SendMessageResponse> {
    try {
      const response = await this.client.post<SendMessageResponse>(
        `/${WHATSAPP_CONFIG.PHONE_NUMBER_ID}/messages`,
        message
      );

      return response.data;
    } catch (error: any) {
      console.error('Failed to send message:', error.response?.data || error);
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
        console.debug('WhatsApp API request:', {
          method: config.method,
          url: config.url,
          data: config.data
        });
        return config;
      },
      (error) => {
        console.error('WhatsApp API request error:', error);
        return Promise.reject(error);
      }
    );

    // Response logging
    this.client.interceptors.response.use(
      (response) => {
        console.debug('WhatsApp API response:', {
          status: response.status,
          data: response.data
        });
        return response;
      },
      (error) => {
        console.error('WhatsApp API response error:', {
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

// Export singleton instance
export const whatsAppClient = new WhatsAppClient();