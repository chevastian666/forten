// Event publisher for auth service

import {
  RabbitMQClient,
  EventBuilder,
  EventType,
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
  UserLoggedInEvent,
  PasswordResetRequestedEvent,
  Logger,
} from '@forten/shared';

export class AuthEventPublisher {
  private rabbitmq: RabbitMQClient;
  private logger: Logger;
  private serviceName = 'auth-service';

  constructor(rabbitmq: RabbitMQClient, logger: Logger) {
    this.rabbitmq = rabbitmq;
    this.logger = logger;
  }

  // Publish user created event
  async publishUserCreated(data: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  }): Promise<void> {
    const event = EventBuilder.create<UserCreatedEvent>(
      EventType.USER_CREATED,
      { data },
      this.serviceName
    );

    await this.rabbitmq.publish(event);
    
    this.logger.info('User created event published', {
      eventId: event.id,
      userId: data.userId,
    });
  }

  // Publish user updated event
  async publishUserUpdated(data: {
    userId: string;
    changes: Record<string, any>;
  }): Promise<void> {
    const event = EventBuilder.create<UserUpdatedEvent>(
      EventType.USER_UPDATED,
      { data },
      this.serviceName
    );

    await this.rabbitmq.publish(event);
    
    this.logger.info('User updated event published', {
      eventId: event.id,
      userId: data.userId,
    });
  }

  // Publish user deleted event
  async publishUserDeleted(data: {
    userId: string;
  }): Promise<void> {
    const event = EventBuilder.create<UserDeletedEvent>(
      EventType.USER_DELETED,
      { data },
      this.serviceName
    );

    await this.rabbitmq.publish(event);
    
    this.logger.info('User deleted event published', {
      eventId: event.id,
      userId: data.userId,
    });
  }

  // Publish user logged in event
  async publishUserLoggedIn(data: {
    userId: string;
    email: string;
    ipAddress: string;
    userAgent: string;
  }): Promise<void> {
    const event = EventBuilder.create<UserLoggedInEvent>(
      EventType.USER_LOGGED_IN,
      { data },
      this.serviceName
    );

    await this.rabbitmq.publish(event);
    
    this.logger.info('User logged in event published', {
      eventId: event.id,
      userId: data.userId,
    });
  }

  // Publish password reset requested event
  async publishPasswordResetRequested(data: {
    email: string;
    resetToken: string;
    expiresAt: Date;
  }): Promise<void> {
    const event = EventBuilder.create<PasswordResetRequestedEvent>(
      EventType.PASSWORD_RESET_REQUESTED,
      { data },
      this.serviceName
    );

    await this.rabbitmq.publish(event);
    
    this.logger.info('Password reset requested event published', {
      eventId: event.id,
      email: data.email,
    });
  }
}