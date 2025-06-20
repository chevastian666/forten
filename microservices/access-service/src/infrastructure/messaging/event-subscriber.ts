// Event subscriber for access service

import {
  RabbitMQClient,
  EventType,
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
  Logger,
} from '@forten/shared';
import { IAccessRepository } from '../../domain/repositories/IAccessRepository';
import { IVisitorRepository } from '../../domain/repositories/IVisitorRepository';

export class AccessEventSubscriber {
  private rabbitmq: RabbitMQClient;
  private logger: Logger;
  private accessRepository: IAccessRepository;
  private visitorRepository: IVisitorRepository;

  constructor(
    rabbitmq: RabbitMQClient,
    logger: Logger,
    accessRepository: IAccessRepository,
    visitorRepository: IVisitorRepository
  ) {
    this.rabbitmq = rabbitmq;
    this.logger = logger;
    this.accessRepository = accessRepository;
    this.visitorRepository = visitorRepository;
  }

  // Subscribe to all relevant events
  async subscribeToEvents(): Promise<void> {
    // Subscribe to user created events
    await this.rabbitmq.subscribe({
      eventType: EventType.USER_CREATED,
      handler: this.handleUserCreated.bind(this),
      queue: 'access-service.user.created',
      retries: 3,
      retryDelay: 1000,
    });

    // Subscribe to user updated events
    await this.rabbitmq.subscribe({
      eventType: EventType.USER_UPDATED,
      handler: this.handleUserUpdated.bind(this),
      queue: 'access-service.user.updated',
      retries: 3,
      retryDelay: 1000,
    });

    // Subscribe to user deleted events
    await this.rabbitmq.subscribe({
      eventType: EventType.USER_DELETED,
      handler: this.handleUserDeleted.bind(this),
      queue: 'access-service.user.deleted',
      retries: 3,
      retryDelay: 1000,
    });

    this.logger.info('Access service subscribed to auth events');
  }

  // Handle user created event
  private async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    this.logger.info('Processing user created event', {
      eventId: event.id,
      userId: event.data.userId,
    });

    try {
      // Create default access permissions for new user
      await this.createDefaultAccess(event.data.userId, event.data.role);

      // If user has visitor role, create visitor profile
      if (event.data.role === 'visitor') {
        await this.createVisitorProfile({
          userId: event.data.userId,
          email: event.data.email,
          firstName: event.data.firstName,
          lastName: event.data.lastName,
        });
      }

      this.logger.info('User created event processed successfully', {
        eventId: event.id,
        userId: event.data.userId,
      });
    } catch (error) {
      this.logger.error('Failed to process user created event', error as Error, {
        eventId: event.id,
        userId: event.data.userId,
      });
      throw error;
    }
  }

  // Handle user updated event
  private async handleUserUpdated(event: UserUpdatedEvent): Promise<void> {
    this.logger.info('Processing user updated event', {
      eventId: event.id,
      userId: event.data.userId,
    });

    try {
      // Update access permissions if role changed
      if (event.data.changes.role) {
        await this.updateAccessPermissions(
          event.data.userId,
          event.data.changes.role
        );
      }

      // Update visitor profile if exists
      const visitor = await this.visitorRepository.findByUserId(event.data.userId);
      if (visitor && (event.data.changes.firstName || event.data.changes.lastName || event.data.changes.email)) {
        await this.visitorRepository.update(visitor.id, {
          firstName: event.data.changes.firstName || visitor.firstName,
          lastName: event.data.changes.lastName || visitor.lastName,
          email: event.data.changes.email || visitor.email,
        });
      }

      this.logger.info('User updated event processed successfully', {
        eventId: event.id,
        userId: event.data.userId,
      });
    } catch (error) {
      this.logger.error('Failed to process user updated event', error as Error, {
        eventId: event.id,
        userId: event.data.userId,
      });
      throw error;
    }
  }

  // Handle user deleted event
  private async handleUserDeleted(event: UserDeletedEvent): Promise<void> {
    this.logger.info('Processing user deleted event', {
      eventId: event.id,
      userId: event.data.userId,
    });

    try {
      // Revoke all access permissions
      await this.revokeAllAccess(event.data.userId);

      // Delete visitor profile if exists
      const visitor = await this.visitorRepository.findByUserId(event.data.userId);
      if (visitor) {
        await this.visitorRepository.delete(visitor.id);
      }

      this.logger.info('User deleted event processed successfully', {
        eventId: event.id,
        userId: event.data.userId,
      });
    } catch (error) {
      this.logger.error('Failed to process user deleted event', error as Error, {
        eventId: event.id,
        userId: event.data.userId,
      });
      throw error;
    }
  }

  // Create default access permissions
  private async createDefaultAccess(userId: string, role: string): Promise<void> {
    // Implementation depends on your access control model
    // This is a placeholder
    this.logger.debug('Creating default access for user', { userId, role });
  }

  // Update access permissions
  private async updateAccessPermissions(userId: string, newRole: string): Promise<void> {
    // Implementation depends on your access control model
    // This is a placeholder
    this.logger.debug('Updating access permissions for user', { userId, newRole });
  }

  // Revoke all access
  private async revokeAllAccess(userId: string): Promise<void> {
    // Implementation depends on your access control model
    // This is a placeholder
    this.logger.debug('Revoking all access for user', { userId });
  }

  // Create visitor profile
  private async createVisitorProfile(data: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
  }): Promise<void> {
    // Implementation depends on your visitor model
    // This is a placeholder
    this.logger.debug('Creating visitor profile', data);
  }
}