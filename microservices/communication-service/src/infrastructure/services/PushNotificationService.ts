import * as admin from 'firebase-admin';
import { Notification, NotificationChannel } from '../../domain/entities/Notification';
import { INotificationService, SendResult, DeliveryStatus } from '../../application/interfaces/INotificationService';
import { Logger } from '../../application/interfaces/ILogger';

export interface PushNotificationConfig {
  firebase?: {
    projectId: string;
    privateKey: string;
    clientEmail: string;
  };
  apn?: {
    keyId: string;
    teamId: string;
    bundleId: string;
    privateKey: string;
    production: boolean;
  };
}

export class PushNotificationService implements INotificationService {
  private firebaseApp?: admin.app.App;

  constructor(
    private config: PushNotificationConfig,
    private logger: Logger
  ) {
    this.initialize();
  }

  private initialize(): void {
    if (this.config.firebase) {
      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: this.config.firebase.projectId,
          privateKey: this.config.firebase.privateKey.replace(/\\n/g, '\n'),
          clientEmail: this.config.firebase.clientEmail
        })
      });
    }
  }

  async send(notification: Notification): Promise<SendResult> {
    if (notification.channel !== NotificationChannel.PUSH) {
      return {
        success: false,
        error: `Unsupported channel for push service: ${notification.channel}`
      };
    }

    try {
      return await this.sendFirebase(notification);
    } catch (error: any) {
      this.logger.error('Push notification send failed', { 
        error: error.message,
        notificationId: notification.id 
      });

      return {
        success: false,
        error: error.message,
        errorCode: error.code
      };
    }
  }

  private async sendFirebase(notification: Notification): Promise<SendResult> {
    if (!this.firebaseApp) {
      throw new Error('Firebase not initialized');
    }

    // Extract device tokens from recipient address
    // Format: "push:token1,token2,token3" or just "token"
    const tokens = notification.recipientAddress.startsWith('push:')
      ? notification.recipientAddress.substring(5).split(',')
      : [notification.recipientAddress];

    const message: admin.messaging.MulticastMessage = {
      notification: {
        title: notification.content.subject || 'Notification',
        body: notification.content.body
      },
      data: {
        notificationId: notification.id,
        campaignId: notification.metadata.campaignId || '',
        templateId: notification.metadata.templateId || '',
        trackingId: notification.metadata.trackingId || '',
        ...notification.content.variables
      },
      tokens,
      android: {
        priority: this.mapPriority(notification.priority),
        notification: {
          clickAction: 'OPEN_APP',
          tag: notification.metadata.campaignId || notification.id
        }
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: notification.content.subject || 'Notification',
              body: notification.content.body
            },
            badge: 1,
            sound: 'default',
            threadId: notification.metadata.campaignId || notification.id
          }
        }
      }
    };

    // Add image if present in attachments
    const imageAttachment = notification.content.attachments?.find(
      a => a.contentType?.startsWith('image/')
    );
    if (imageAttachment && imageAttachment.path) {
      message.notification!.imageUrl = imageAttachment.path;
    }

    const response = await admin.messaging(this.firebaseApp).sendMulticast(message);

    this.logger.info('Push notification sent via Firebase', {
      notificationId: notification.id,
      successCount: response.successCount,
      failureCount: response.failureCount,
      tokens: tokens.length
    });

    // Handle partial failures
    const failedTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        failedTokens.push(tokens[idx]);
        this.logger.warn('Push notification failed for token', {
          token: tokens[idx],
          error: resp.error?.message,
          code: resp.error?.code
        });
      }
    });

    if (response.successCount === 0) {
      return {
        success: false,
        error: 'All tokens failed',
        errorCode: 'ALL_TOKENS_FAILED',
        providerResponse: response
      };
    }

    return {
      success: true,
      messageId: `firebase-multicast-${Date.now()}`,
      providerResponse: {
        successCount: response.successCount,
        failureCount: response.failureCount,
        failedTokens
      }
    };
  }

  private mapPriority(priority: Notification['priority']): 'high' | 'normal' {
    switch (priority) {
      case 'urgent':
      case 'high':
        return 'high';
      default:
        return 'normal';
    }
  }

  async getStatus(messageId: string): Promise<DeliveryStatus | null> {
    // Firebase doesn't provide message status tracking
    // Status updates would come from client-side SDK events
    return null;
  }

  async cancelScheduled(messageId: string): Promise<boolean> {
    // Firebase doesn't support scheduled messages at the server level
    return false;
  }

  // Handle token management
  async validateTokens(tokens: string[]): Promise<{ valid: string[]; invalid: string[] }> {
    if (!this.firebaseApp) {
      throw new Error('Firebase not initialized');
    }

    const valid: string[] = [];
    const invalid: string[] = [];

    // Firebase allows bulk token validation
    try {
      const response = await admin.messaging(this.firebaseApp).sendMulticast({
        tokens,
        data: { test: 'true' },
        dryRun: true // Don't actually send
      });

      response.responses.forEach((resp, idx) => {
        if (resp.success) {
          valid.push(tokens[idx]);
        } else {
          invalid.push(tokens[idx]);
        }
      });
    } catch (error) {
      this.logger.error('Token validation failed', { error });
    }

    return { valid, invalid };
  }

  // Subscribe tokens to topics for campaign targeting
  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    if (!this.firebaseApp) {
      throw new Error('Firebase not initialized');
    }

    try {
      const response = await admin.messaging(this.firebaseApp)
        .subscribeToTopic(tokens, topic);

      this.logger.info('Tokens subscribed to topic', {
        topic,
        successCount: response.successCount,
        failureCount: response.failureCount
      });
    } catch (error) {
      this.logger.error('Topic subscription failed', { error, topic });
      throw error;
    }
  }

  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    if (!this.firebaseApp) {
      throw new Error('Firebase not initialized');
    }

    try {
      const response = await admin.messaging(this.firebaseApp)
        .unsubscribeFromTopic(tokens, topic);

      this.logger.info('Tokens unsubscribed from topic', {
        topic,
        successCount: response.successCount,
        failureCount: response.failureCount
      });
    } catch (error) {
      this.logger.error('Topic unsubscription failed', { error, topic });
      throw error;
    }
  }
}