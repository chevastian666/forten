/**
 * WhatsApp Notification Service
 * Handles automated notifications via WhatsApp
 */

import { whatsAppClient } from './client.service';
import { WHATSAPP_CONFIG } from './config';
import { SendMessageResponse, TemplateComponent } from './types';

export interface Resident {
  id: string;
  name: string;
  phone: string;
  apartment: string;
  buildingId: string;
  preferredLanguage?: string;
  notificationPreferences?: {
    whatsapp?: boolean;
    visitorsNotifications?: boolean;
    deliveryNotifications?: boolean;
    maintenanceNotices?: boolean;
    securityAlerts?: boolean;
    paymentReminders?: boolean;
  };
}

export interface Visitor {
  id: string;
  name: string;
  apartment: string;
  pin: string;
  photo?: string;
  validFrom: Date;
  validUntil: Date;
  residentId: string;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class WhatsAppNotificationService {
  /**
   * Send access notification when visitor arrives
   */
  async sendAccessNotification(
    resident: Resident,
    visitor: Visitor
  ): Promise<NotificationResult> {
    if (!this.shouldSendNotification(resident, 'visitorsNotifications')) {
      return { success: false, error: 'Notifications disabled' };
    }

    try {
      const components: TemplateComponent[] = [
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

      const response = await whatsAppClient.sendTemplate(
        resident.phone,
        WHATSAPP_CONFIG.TEMPLATES.ACCESS_NOTIFICATION,
        resident.preferredLanguage || 'es',
        components
      );

      // Send interactive buttons for quick actions
      await this.sendAccessActions(resident.phone, visitor);

      return {
        success: true,
        messageId: response.messages[0]?.id
      };
    } catch (error: any) {
      console.error('Failed to send access notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send visitor arrival notification
   */
  async sendVisitorArrival(
    resident: Resident,
    visitorName: string,
    imageUrl?: string
  ): Promise<NotificationResult> {
    if (!this.shouldSendNotification(resident, 'visitorsNotifications')) {
      return { success: false, error: 'Notifications disabled' };
    }

    try {
      const components: TemplateComponent[] = [
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

      const response = await whatsAppClient.sendTemplate(
        resident.phone,
        WHATSAPP_CONFIG.TEMPLATES.VISITOR_ARRIVAL,
        resident.preferredLanguage || 'es',
        components
      );

      // Send quick response buttons
      await whatsAppClient.sendButtons(
        resident.phone,
        `¿Desea autorizar el acceso a ${visitorName}?`,
        [
          WHATSAPP_CONFIG.QUICK_REPLIES.AUTHORIZE_ACCESS.YES,
          WHATSAPP_CONFIG.QUICK_REPLIES.AUTHORIZE_ACCESS.NO,
          WHATSAPP_CONFIG.QUICK_REPLIES.AUTHORIZE_ACCESS.CALL
        ],
        'Autorización de acceso'
      );

      return {
        success: true,
        messageId: response.messages[0]?.id
      };
    } catch (error: any) {
      console.error('Failed to send visitor arrival notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send delivery notification
   */
  async sendDeliveryNotification(
    resident: Resident,
    courierCompany: string,
    packageDescription: string
  ): Promise<NotificationResult> {
    if (!this.shouldSendNotification(resident, 'deliveryNotifications')) {
      return { success: false, error: 'Notifications disabled' };
    }

    try {
      const response = await whatsAppClient.sendTemplate(
        resident.phone,
        WHATSAPP_CONFIG.TEMPLATES.DELIVERY_NOTIFICATION,
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

      // Send delivery options
      await whatsAppClient.sendButtons(
        resident.phone,
        'Seleccione una opción para su paquete:',
        [
          WHATSAPP_CONFIG.QUICK_REPLIES.DELIVERY_OPTIONS.RECEIVE,
          WHATSAPP_CONFIG.QUICK_REPLIES.DELIVERY_OPTIONS.REJECT,
          WHATSAPP_CONFIG.QUICK_REPLIES.DELIVERY_OPTIONS.LEAVE
        ],
        'Opciones de entrega'
      );

      return {
        success: true,
        messageId: response.messages[0]?.id
      };
    } catch (error: any) {
      console.error('Failed to send delivery notification:', error);
      return {
        success: false,
        error: error.message
      };
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
  ): Promise<NotificationResult> {
    // Emergency alerts bypass notification preferences
    try {
      const response = await whatsAppClient.sendTemplate(
        resident.phone,
        WHATSAPP_CONFIG.TEMPLATES.EMERGENCY_ALERT,
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

      // Send location if coordinates are provided
      if (location.includes(',')) {
        const [lat, lng] = location.split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          await whatsAppClient.sendLocation(
            resident.phone,
            lat,
            lng,
            'Ubicación de emergencia',
            alertType
          );
        }
      }

      return {
        success: true,
        messageId: response.messages[0]?.id
      };
    } catch (error: any) {
      console.error('Failed to send emergency alert:', error);
      return {
        success: false,
        error: error.message
      };
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
  ): Promise<NotificationResult> {
    if (!this.shouldSendNotification(resident, 'maintenanceNotices')) {
      return { success: false, error: 'Notifications disabled' };
    }

    try {
      const response = await whatsAppClient.sendTemplate(
        resident.phone,
        WHATSAPP_CONFIG.TEMPLATES.MAINTENANCE_NOTICE,
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

      return {
        success: true,
        messageId: response.messages[0]?.id
      };
    } catch (error: any) {
      console.error('Failed to send maintenance notice:', error);
      return {
        success: false,
        error: error.message
      };
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
  ): Promise<NotificationResult> {
    if (!this.shouldSendNotification(resident, 'securityAlerts')) {
      return { success: false, error: 'Notifications disabled' };
    }

    try {
      const components: TemplateComponent[] = [
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

      const response = await whatsAppClient.sendTemplate(
        resident.phone,
        WHATSAPP_CONFIG.TEMPLATES.SECURITY_ALERT,
        resident.preferredLanguage || 'es',
        components
      );

      return {
        success: true,
        messageId: response.messages[0]?.id
      };
    } catch (error: any) {
      console.error('Failed to send security alert:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send PIN notification
   */
  async sendPinNotification(
    resident: Resident,
    pin: string,
    purpose: string,
    validUntil: Date
  ): Promise<NotificationResult> {
    try {
      const response = await whatsAppClient.sendTemplate(
        resident.phone,
        WHATSAPP_CONFIG.TEMPLATES.PIN_NOTIFICATION,
        resident.preferredLanguage || 'es',
        [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: pin },
              { type: 'text', text: purpose },
              { type: 'text', text: validUntil.toLocaleDateString('es-UY') }
            ]
          }
        ]
      );

      return {
        success: true,
        messageId: response.messages[0]?.id
      };
    } catch (error: any) {
      console.error('Failed to send PIN notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send payment reminder
   */
  async sendPaymentReminder(
    resident: Resident,
    amount: string,
    dueDate: string,
    concept: string
  ): Promise<NotificationResult> {
    if (!this.shouldSendNotification(resident, 'paymentReminders')) {
      return { success: false, error: 'Notifications disabled' };
    }

    try {
      const response = await whatsAppClient.sendTemplate(
        resident.phone,
        WHATSAPP_CONFIG.TEMPLATES.PAYMENT_REMINDER,
        resident.preferredLanguage || 'es',
        [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: amount },
              { type: 'text', text: dueDate },
              { type: 'text', text: concept }
            ]
          }
        ]
      );

      return {
        success: true,
        messageId: response.messages[0]?.id
      };
    } catch (error: any) {
      console.error('Failed to send payment reminder:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send welcome message to new resident
   */
  async sendWelcomeMessage(resident: Resident): Promise<NotificationResult> {
    try {
      const response = await whatsAppClient.sendTemplate(
        resident.phone,
        WHATSAPP_CONFIG.TEMPLATES.WELCOME_MESSAGE,
        resident.preferredLanguage || 'es',
        [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: resident.name },
              { type: 'text', text: resident.apartment }
            ]
          }
        ]
      );

      // Send helpful information
      await whatsAppClient.sendList(
        resident.phone,
        'Información útil para residentes',
        'Ver información',
        [
          {
            title: 'Servicios disponibles',
            rows: [
              {
                id: 'info_access',
                title: 'Control de accesos',
                description: 'Gestión de visitantes y PINs'
              },
              {
                id: 'info_maintenance',
                title: 'Mantenimiento',
                description: 'Solicitar servicios de mantenimiento'
              },
              {
                id: 'info_emergency',
                title: 'Emergencias',
                description: 'Contacto de emergencia 24/7'
              }
            ]
          },
          {
            title: 'Comandos útiles',
            rows: [
              {
                id: 'cmd_help',
                title: '/ayuda',
                description: 'Ver todos los comandos disponibles'
              },
              {
                id: 'cmd_status',
                title: '/estado',
                description: 'Estado del edificio'
              },
              {
                id: 'cmd_access',
                title: '/accesos',
                description: 'Ver accesos activos'
              }
            ]
          }
        ],
        'Bienvenido a FORTEN'
      );

      return {
        success: true,
        messageId: response.messages[0]?.id
      };
    } catch (error: any) {
      console.error('Failed to send welcome message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Broadcast message to multiple residents
   */
  async broadcast(
    residents: Resident[],
    templateName: string,
    parameters: TemplateComponent[]
  ): Promise<{
    sent: number;
    failed: number;
    errors: Array<{ resident: Resident; error: string }>;
  }> {
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as Array<{ resident: Resident; error: string }>
    };

    // Send in batches to avoid rate limits
    const batchSize = WHATSAPP_CONFIG.RATE_LIMITS.BROADCAST_BATCH_SIZE;
    const delay = WHATSAPP_CONFIG.RATE_LIMITS.BROADCAST_DELAY_MS;

    for (let i = 0; i < residents.length; i += batchSize) {
      const batch = residents.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (resident) => {
          try {
            await whatsAppClient.sendTemplate(
              resident.phone,
              templateName,
              resident.preferredLanguage || 'es',
              parameters
            );
            results.sent++;
          } catch (error: any) {
            results.failed++;
            results.errors.push({ resident, error: error.message });
          }
        })
      );

      // Delay between batches
      if (i + batchSize < residents.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return results;
  }

  // Private methods

  private shouldSendNotification(
    resident: Resident,
    notificationType: keyof NonNullable<Resident['notificationPreferences']>
  ): boolean {
    return resident.notificationPreferences?.whatsapp !== false &&
           resident.notificationPreferences?.[notificationType] !== false;
  }

  private async sendAccessActions(phone: string, visitor: Visitor): Promise<void> {
    const validityText = `Válido desde ${visitor.validFrom.toLocaleDateString('es-UY')} hasta ${visitor.validUntil.toLocaleDateString('es-UY')}`;

    await whatsAppClient.sendList(
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
}

// Export singleton instance
export const whatsAppNotificationService = new WhatsAppNotificationService();