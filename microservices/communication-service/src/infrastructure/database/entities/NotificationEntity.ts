import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { NotificationChannel, NotificationStatus, NotificationPriority, NotificationMetadata, NotificationContent } from '../../../domain/entities/Notification';
import { CampaignEntity } from './CampaignEntity';
import { TemplateEntity } from './TemplateEntity';

@Entity('notifications')
@Index(['recipientId', 'status'])
@Index(['channel', 'status'])
@Index(['campaignId'])
@Index(['createdAt'])
@Index(['metadata.scheduledAt'])
export class NotificationEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: NotificationChannel
  })
  channel: NotificationChannel;

  @Column('uuid')
  @Index()
  recipientId: string;

  @Column('varchar', { length: 255 })
  recipientAddress: string;

  @Column('varchar', { length: 255, nullable: true })
  recipientName?: string;

  @Column('uuid', { nullable: true })
  senderId?: string;

  @Column('varchar', { length: 255, nullable: true })
  senderName?: string;

  @Column('varchar', { length: 255, nullable: true })
  senderAddress?: string;

  @Column('jsonb')
  content: NotificationContent;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING
  })
  @Index()
  status: NotificationStatus;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM
  })
  priority: NotificationPriority;

  @Column('jsonb')
  metadata: NotificationMetadata;

  @Column('text', { array: true, nullable: true })
  tags?: string[];

  @Column('uuid', { nullable: true })
  campaignId?: string;

  @ManyToOne(() => CampaignEntity, { nullable: true })
  @JoinColumn({ name: 'campaignId' })
  campaign?: CampaignEntity;

  @Column('uuid', { nullable: true })
  templateId?: string;

  @ManyToOne(() => TemplateEntity, { nullable: true })
  @JoinColumn({ name: 'templateId' })
  template?: TemplateEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Indexes for analytics
  @Index()
  @Column('timestamp', { nullable: true })
  sentAt?: Date;

  @Index()
  @Column('timestamp', { nullable: true })
  deliveredAt?: Date;

  @Index()
  @Column('timestamp', { nullable: true })
  openedAt?: Date;

  @Column('varchar', { length: 255, nullable: true })
  @Index()
  messageId?: string;
}