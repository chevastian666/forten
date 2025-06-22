import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { createNotificationRoutes } from './presentation/routes/notificationRoutes';
import { createTemplateRoutes } from './presentation/routes/templateRoutes';
import { createCampaignRoutes } from './presentation/routes/campaignRoutes';
import { createContactRoutes } from './presentation/routes/contactRoutes';
import { createWebhookRoutes } from './presentation/routes/webhookRoutes';
import { errorHandler } from './presentation/middleware/errorHandler';
import { requestLogger } from './presentation/middleware/requestLogger';
import { NotificationController } from './presentation/controllers/NotificationController';
import { SendNotificationUseCase } from './application/use-cases/SendNotificationUseCase';
import { NotificationRepository } from './infrastructure/repositories/NotificationRepository';
import { TwilioService } from './infrastructure/services/TwilioService';
import { EmailService } from './infrastructure/services/EmailService';
import { PushNotificationService } from './infrastructure/services/PushNotificationService';
import { QueueService } from './infrastructure/services/QueueService';
import { TemplateEngine } from './infrastructure/services/TemplateEngine';
import { WinstonLogger } from './infrastructure/services/WinstonLogger';
import { NotificationServiceFactory } from './infrastructure/services/NotificationServiceFactory';
import { dataSource } from './infrastructure/database/data-source';

// Load environment variables
dotenv.config();

async function bootstrap() {
  // Initialize database
  await dataSource.initialize();
  console.log('Database connected');

  // Run migrations
  await dataSource.runMigrations();
  console.log('Migrations completed');

  // Create Express app
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // Initialize services
  const logger = new WinstonLogger();
  
  const twilioService = new TwilioService({
    accountSid: process.env.TWILIO_ACCOUNT_SID!,
    authToken: process.env.TWILIO_AUTH_TOKEN!,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM,
    smsFrom: process.env.TWILIO_SMS_FROM,
    webhookUrl: process.env.WEBHOOK_BASE_URL
  }, logger);

  const emailService = new EmailService({
    provider: process.env.EMAIL_PROVIDER as 'smtp' | 'sendgrid' || 'smtp',
    smtp: process.env.EMAIL_PROVIDER === 'smtp' ? {
      host: process.env.SMTP_HOST!,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!
      }
    } : undefined,
    sendgrid: process.env.EMAIL_PROVIDER === 'sendgrid' ? {
      apiKey: process.env.SENDGRID_API_KEY!
    } : undefined,
    from: {
      email: process.env.EMAIL_FROM_ADDRESS!,
      name: process.env.EMAIL_FROM_NAME!
    },
    replyTo: process.env.EMAIL_REPLY_TO,
    webhookUrl: process.env.WEBHOOK_BASE_URL
  }, logger);

  const pushService = new PushNotificationService({
    firebase: process.env.FIREBASE_PROJECT_ID ? {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!
    } : undefined
  }, logger);

  const queueService = new QueueService({
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0')
    }
  }, logger);

  const templateEngine = new TemplateEngine(logger);

  // Initialize repositories
  const notificationRepository = new NotificationRepository(
    dataSource.getRepository('NotificationEntity')
  );
  const templateRepository = new TemplateRepository(
    dataSource.getRepository('TemplateEntity')
  );
  const contactRepository = new ContactRepository(
    dataSource.getRepository('ContactEntity')
  );
  const campaignRepository = new CampaignRepository(
    dataSource.getRepository('CampaignEntity')
  );

  // Create notification service factory
  const notificationServiceFactory = new NotificationServiceFactory(
    twilioService,
    emailService,
    pushService,
    logger
  );

  // Initialize use cases
  const sendNotificationUseCase = new SendNotificationUseCase(
    notificationRepository,
    templateRepository,
    contactRepository,
    notificationServiceFactory,
    queueService,
    templateEngine,
    logger
  );

  // Initialize controllers
  const notificationController = new NotificationController(
    sendNotificationUseCase,
    notificationRepository,
    logger
  );

  // Routes
  app.use('/api/v1/notifications', createNotificationRoutes(notificationController));
  app.use('/api/v1/templates', createTemplateRoutes(/* controllers */));
  app.use('/api/v1/campaigns', createCampaignRoutes(/* controllers */));
  app.use('/api/v1/contacts', createContactRoutes(/* controllers */));
  app.use('/webhooks', createWebhookRoutes(
    twilioService,
    emailService,
    notificationRepository,
    logger
  ));

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'communication-service',
      timestamp: new Date().toISOString()
    });
  });

  // Error handling
  app.use(errorHandler);

  // Start workers
  const notificationWorker = new NotificationWorker(
    queueService,
    notificationRepository,
    notificationServiceFactory,
    logger
  );
  await notificationWorker.start();

  const campaignWorker = new CampaignWorker(
    queueService,
    campaignRepository,
    notificationRepository,
    contactRepository,
    sendNotificationUseCase,
    logger
  );
  await campaignWorker.start();

  // Start server
  const port = process.env.PORT || 3003;
  app.listen(port, () => {
    console.log(`Communication service running on port ${port}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await queueService.close();
    await dataSource.destroy();
    process.exit(0);
  });
}

// Start the application
bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});