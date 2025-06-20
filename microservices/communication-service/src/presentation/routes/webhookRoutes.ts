import { Router, Request, Response } from 'express';
import { TwilioService } from '../../infrastructure/services/TwilioService';
import { EmailService } from '../../infrastructure/services/EmailService';
import { INotificationRepository } from '../../domain/repositories/INotificationRepository';
import { Logger } from '../../application/interfaces/ILogger';
import crypto from 'crypto';

export function createWebhookRoutes(
  twilioService: TwilioService,
  emailService: EmailService,
  notificationRepository: INotificationRepository,
  logger: Logger
): Router {
  const router = Router();

  // Twilio webhook for SMS/WhatsApp status updates
  router.post('/twilio/status', async (req: Request, res: Response) => {
    try {
      // Verify Twilio signature (optional but recommended)
      // const isValid = verifyTwilioSignature(req);
      // if (!isValid) {
      //   return res.status(403).send('Forbidden');
      // }

      const { notificationId } = req.query;
      const status = req.body;

      logger.info('Twilio webhook received', { notificationId, status });

      if (notificationId) {
        await updateNotificationStatus(
          notificationRepository,
          notificationId as string,
          status,
          'twilio'
        );
      }

      await twilioService.handleStatusWebhook(status);

      res.status(200).send('OK');
    } catch (error: any) {
      logger.error('Twilio webhook error', { error: error.message });
      res.status(500).send('Internal Server Error');
    }
  });

  // SendGrid webhook for email events
  router.post('/sendgrid/events', async (req: Request, res: Response) => {
    try {
      // Verify SendGrid webhook (optional but recommended)
      // const isValid = verifySendGridWebhook(req);
      // if (!isValid) {
      //   return res.status(403).send('Forbidden');
      // }

      const events = req.body;

      if (!Array.isArray(events)) {
        return res.status(400).send('Invalid webhook data');
      }

      logger.info('SendGrid webhook received', { eventCount: events.length });

      // Process each event
      for (const event of events) {
        if (event.notificationId) {
          await updateNotificationStatus(
            notificationRepository,
            event.notificationId,
            event,
            'sendgrid'
          );
        }
      }

      await emailService.handleSendGridWebhook(events);

      res.status(200).send('OK');
    } catch (error: any) {
      logger.error('SendGrid webhook error', { error: error.message });
      res.status(500).send('Internal Server Error');
    }
  });

  // Generic webhook endpoint for other providers
  router.post('/generic/:provider', async (req: Request, res: Response) => {
    try {
      const { provider } = req.params;
      const { notificationId, messageId, status, timestamp, metadata } = req.body;

      logger.info('Generic webhook received', { 
        provider, 
        notificationId, 
        messageId, 
        status 
      });

      if (notificationId) {
        const notification = await notificationRepository.findById(notificationId);
        
        if (notification) {
          const updates: any = {
            metadata: {
              ...notification.metadata,
              lastWebhookAt: new Date(),
              lastWebhookStatus: status
            }
          };

          // Map status to our notification status
          switch (status) {
            case 'delivered':
              notification.markAsDelivered();
              updates.status = notification.status;
              updates.metadata.deliveredAt = notification.metadata.deliveredAt;
              break;
            case 'failed':
            case 'bounced':
              notification.markAsFailed(metadata?.error || 'Delivery failed');
              updates.status = notification.status;
              updates.metadata.failedAt = notification.metadata.failedAt;
              updates.metadata.errorMessage = notification.metadata.errorMessage;
              break;
            case 'opened':
              notification.markAsOpened();
              updates.status = notification.status;
              updates.metadata.openedAt = notification.metadata.openedAt;
              break;
            case 'clicked':
              notification.markAsClicked(metadata?.link);
              updates.status = notification.status;
              updates.metadata.clickedAt = notification.metadata.clickedAt;
              updates.metadata.clickedLinks = notification.metadata.clickedLinks;
              break;
          }

          await notificationRepository.update(notificationId, updates);
        }
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      logger.error('Generic webhook error', { 
        error: error.message, 
        provider: req.params.provider 
      });
      res.status(500).send('Internal Server Error');
    }
  });

  // Health check endpoint for webhook configuration
  router.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });

  return router;
}

async function updateNotificationStatus(
  repository: INotificationRepository,
  notificationId: string,
  webhookData: any,
  provider: string
): Promise<void> {
  const notification = await repository.findById(notificationId);
  
  if (!notification) {
    return;
  }

  const updates: any = {
    metadata: {
      ...notification.metadata,
      lastWebhookAt: new Date(),
      lastWebhookProvider: provider,
      webhookData: {
        ...notification.metadata.webhookData,
        [provider]: webhookData
      }
    }
  };

  // Provider-specific status mapping
  if (provider === 'twilio') {
    const status = webhookData.MessageStatus || webhookData.SmsStatus;
    
    switch (status) {
      case 'delivered':
        notification.markAsDelivered();
        updates.status = notification.status;
        updates.metadata.deliveredAt = notification.metadata.deliveredAt;
        break;
      case 'failed':
      case 'undelivered':
        notification.markAsFailed(
          webhookData.ErrorMessage || 'Delivery failed',
          webhookData.ErrorCode
        );
        updates.status = notification.status;
        updates.metadata.failedAt = notification.metadata.failedAt;
        updates.metadata.errorMessage = notification.metadata.errorMessage;
        updates.metadata.errorCode = notification.metadata.errorCode;
        break;
    }
  } else if (provider === 'sendgrid') {
    switch (webhookData.event) {
      case 'delivered':
        notification.markAsDelivered();
        updates.status = notification.status;
        updates.metadata.deliveredAt = notification.metadata.deliveredAt;
        break;
      case 'bounce':
      case 'dropped':
        notification.markAsFailed(
          webhookData.reason || 'Email bounced',
          webhookData.type
        );
        updates.status = notification.status;
        updates.metadata.failedAt = notification.metadata.failedAt;
        updates.metadata.errorMessage = notification.metadata.errorMessage;
        updates.metadata.errorCode = notification.metadata.errorCode;
        break;
      case 'open':
        notification.markAsOpened();
        updates.status = notification.status;
        updates.metadata.openedAt = notification.metadata.openedAt;
        break;
      case 'click':
        notification.markAsClicked(webhookData.url);
        updates.status = notification.status;
        updates.metadata.clickedAt = notification.metadata.clickedAt;
        updates.metadata.clickedLinks = notification.metadata.clickedLinks;
        break;
    }
  }

  await repository.update(notificationId, updates);
}

// Webhook signature verification functions
function verifyTwilioSignature(req: Request): boolean {
  // Implementation depends on Twilio webhook configuration
  // See: https://www.twilio.com/docs/usage/webhooks/webhooks-security
  return true;
}

function verifySendGridWebhook(req: Request): boolean {
  // Implementation depends on SendGrid webhook configuration
  // See: https://sendgrid.com/docs/for-developers/tracking-events/getting-started-event-webhook-security-features/
  return true;
}