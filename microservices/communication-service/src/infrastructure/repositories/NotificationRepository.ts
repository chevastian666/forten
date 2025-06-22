import { Repository, In, Between, LessThan, MoreThan, FindOptionsWhere, FindOptionsOrder } from 'typeorm';
import { Notification, NotificationChannel, NotificationStatus } from '../../domain/entities/Notification';
import { INotificationRepository, NotificationFilter, NotificationSort, PaginationOptions, PaginatedResult } from '../../domain/repositories/INotificationRepository';
import { NotificationEntity } from '../database/entities/NotificationEntity';

export class NotificationRepository implements INotificationRepository {
  constructor(private repository: Repository<NotificationEntity>) {}

  async create(notification: Notification): Promise<Notification> {
    const entity = this.toEntity(notification);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async createBatch(notifications: Notification[]): Promise<Notification[]> {
    const entities = notifications.map(n => this.toEntity(n));
    const saved = await this.repository.save(entities);
    return saved.map(e => this.toDomain(e));
  }

  async findById(id: string): Promise<Notification | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByIds(ids: string[]): Promise<Notification[]> {
    const entities = await this.repository.find({ where: { id: In(ids) } });
    return entities.map(e => this.toDomain(e));
  }

  async findByMessageId(messageId: string): Promise<Notification | null> {
    const entity = await this.repository.findOne({ where: { messageId } });
    return entity ? this.toDomain(entity) : null;
  }

  async find(filter: NotificationFilter, options?: PaginationOptions): Promise<PaginatedResult<Notification>> {
    const where = this.buildWhereClause(filter);
    const order = this.buildOrderClause(options?.sort);

    const [entities, total] = await this.repository.findAndCount({
      where,
      order,
      skip: options ? (options.page - 1) * options.limit : undefined,
      take: options?.limit
    });

    const notifications = entities.map(e => this.toDomain(e));

    return {
      data: notifications,
      total,
      page: options?.page || 1,
      limit: options?.limit || total,
      totalPages: options ? Math.ceil(total / options.limit) : 1
    };
  }

  async update(id: string, notification: Partial<Notification>): Promise<Notification | null> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) return null;

    const updated = await this.repository.save({
      ...entity,
      ...this.toPartialEntity(notification),
      updatedAt: new Date()
    });

    return this.toDomain(updated);
  }

  async updateBatch(updates: { id: string; data: Partial<Notification> }[]): Promise<void> {
    for (const update of updates) {
      await this.update(update.id, update.data);
    }
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected === 1;
  }

  async deleteBatch(ids: string[]): Promise<number> {
    const result = await this.repository.delete(ids);
    return result.affected || 0;
  }

  async findPendingNotifications(limit: number): Promise<Notification[]> {
    const entities = await this.repository.find({
      where: {
        status: NotificationStatus.PENDING,
        metadata: {
          scheduledAt: undefined
        } as any
      },
      order: {
        priority: 'DESC',
        createdAt: 'ASC'
      },
      take: limit
    });

    return entities.map(e => this.toDomain(e));
  }

  async findScheduledNotifications(before: Date, limit: number): Promise<Notification[]> {
    const entities = await this.repository
      .createQueryBuilder('notification')
      .where('notification.status = :status', { status: NotificationStatus.PENDING })
      .andWhere("notification.metadata->>'scheduledAt' <= :before", { before: before.toISOString() })
      .orderBy('notification.priority', 'DESC')
      .addOrderBy("notification.metadata->>'scheduledAt'", 'ASC')
      .limit(limit)
      .getMany();

    return entities.map(e => this.toDomain(e));
  }

  async findFailedForRetry(limit: number): Promise<Notification[]> {
    const entities = await this.repository
      .createQueryBuilder('notification')
      .where('notification.status = :status', { status: NotificationStatus.FAILED })
      .andWhere("(notification.metadata->>'retryCount')::int < (notification.metadata->>'maxRetries')::int")
      .orderBy('notification.priority', 'DESC')
      .addOrderBy('notification.updatedAt', 'ASC')
      .limit(limit)
      .getMany();

    return entities.map(e => this.toDomain(e));
  }

  async countByStatus(filter: NotificationFilter): Promise<Record<NotificationStatus, number>> {
    const baseWhere = this.buildWhereClause(filter);
    const counts: Record<NotificationStatus, number> = {} as any;

    for (const status of Object.values(NotificationStatus)) {
      const count = await this.repository.count({
        where: { ...baseWhere, status }
      });
      counts[status] = count;
    }

    return counts;
  }

  async getDeliveryStats(startDate: Date, endDate: Date, channel?: NotificationChannel): Promise<{
    sent: number;
    delivered: number;
    failed: number;
    opened: number;
    clicked: number;
    avgDeliveryTime: number;
  }> {
    const query = this.repository
      .createQueryBuilder('notification')
      .where('notification.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });

    if (channel) {
      query.andWhere('notification.channel = :channel', { channel });
    }

    const stats = await query
      .select('COUNT(*) FILTER (WHERE notification.status = :sent)', 'sent')
      .addSelect('COUNT(*) FILTER (WHERE notification.status = :delivered)', 'delivered')
      .addSelect('COUNT(*) FILTER (WHERE notification.status = :failed)', 'failed')
      .addSelect('COUNT(*) FILTER (WHERE notification.status = :opened)', 'opened')
      .addSelect('COUNT(*) FILTER (WHERE notification.status = :clicked)', 'clicked')
      .addSelect('AVG(EXTRACT(EPOCH FROM (notification.deliveredAt - notification.sentAt))) FILTER (WHERE notification.deliveredAt IS NOT NULL)', 'avgDeliveryTime')
      .setParameters({
        sent: NotificationStatus.SENT,
        delivered: NotificationStatus.DELIVERED,
        failed: NotificationStatus.FAILED,
        opened: NotificationStatus.OPENED,
        clicked: NotificationStatus.CLICKED
      })
      .getRawOne();

    return {
      sent: parseInt(stats.sent) || 0,
      delivered: parseInt(stats.delivered) || 0,
      failed: parseInt(stats.failed) || 0,
      opened: parseInt(stats.opened) || 0,
      clicked: parseInt(stats.clicked) || 0,
      avgDeliveryTime: parseFloat(stats.avgDeliveryTime) || 0
    };
  }

  private buildWhereClause(filter: NotificationFilter): FindOptionsWhere<NotificationEntity> {
    const where: FindOptionsWhere<NotificationEntity> = {};

    if (filter.ids) {
      where.id = In(filter.ids);
    }

    if (filter.recipientId) {
      where.recipientId = filter.recipientId;
    }

    if (filter.recipientAddress) {
      where.recipientAddress = filter.recipientAddress;
    }

    if (filter.channel) {
      where.channel = filter.channel;
    }

    if (filter.status) {
      where.status = Array.isArray(filter.status) ? In(filter.status) : filter.status;
    }

    if (filter.campaignId) {
      where.campaignId = filter.campaignId;
    }

    if (filter.templateId) {
      where.templateId = filter.templateId;
    }

    if (filter.createdAfter && filter.createdBefore) {
      where.createdAt = Between(filter.createdAfter, filter.createdBefore);
    } else if (filter.createdAfter) {
      where.createdAt = MoreThan(filter.createdAfter);
    } else if (filter.createdBefore) {
      where.createdAt = LessThan(filter.createdBefore);
    }

    return where;
  }

  private buildOrderClause(sort?: NotificationSort): FindOptionsOrder<NotificationEntity> {
    if (!sort) {
      return { createdAt: 'DESC' };
    }

    const order: FindOptionsOrder<NotificationEntity> = {};
    order[sort.field] = sort.direction.toUpperCase() as 'ASC' | 'DESC';
    return order;
  }

  private toEntity(notification: Notification): NotificationEntity {
    const entity = new NotificationEntity();
    
    entity.id = notification.id;
    entity.channel = notification.channel;
    entity.recipientId = notification.recipientId;
    entity.recipientAddress = notification.recipientAddress;
    entity.recipientName = notification.recipientName;
    entity.senderId = notification.senderId;
    entity.senderName = notification.senderName;
    entity.senderAddress = notification.senderAddress;
    entity.content = notification.content;
    entity.status = notification.status;
    entity.priority = notification.priority;
    entity.metadata = notification.metadata;
    entity.tags = notification.tags;
    entity.campaignId = notification.metadata.campaignId;
    entity.templateId = notification.metadata.templateId;
    entity.messageId = notification.metadata.messageId;
    entity.sentAt = notification.metadata.sentAt;
    entity.deliveredAt = notification.metadata.deliveredAt;
    entity.openedAt = notification.metadata.openedAt;
    entity.createdAt = notification.createdAt;
    entity.updatedAt = notification.updatedAt;

    return entity;
  }

  private toPartialEntity(notification: Partial<Notification>): Partial<NotificationEntity> {
    const entity: Partial<NotificationEntity> = {};

    if (notification.status !== undefined) entity.status = notification.status;
    if (notification.content !== undefined) entity.content = notification.content;
    if (notification.metadata !== undefined) {
      entity.metadata = notification.metadata;
      entity.messageId = notification.metadata.messageId;
      entity.sentAt = notification.metadata.sentAt;
      entity.deliveredAt = notification.metadata.deliveredAt;
      entity.openedAt = notification.metadata.openedAt;
    }
    if (notification.tags !== undefined) entity.tags = notification.tags;

    return entity;
  }

  private toDomain(entity: NotificationEntity): Notification {
    return new Notification({
      id: entity.id,
      channel: entity.channel,
      recipientId: entity.recipientId,
      recipientAddress: entity.recipientAddress,
      recipientName: entity.recipientName,
      senderId: entity.senderId,
      senderName: entity.senderName,
      senderAddress: entity.senderAddress,
      content: entity.content,
      status: entity.status,
      priority: entity.priority,
      metadata: entity.metadata,
      tags: entity.tags,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    });
  }
}