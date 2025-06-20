import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { NotificationChannel } from '../../../domain/entities/Notification';
import { CampaignStatus, CampaignType, CampaignAudience, CampaignContent, CampaignSchedule, CampaignSettings, CampaignMetrics, CampaignMetadata } from '../../../domain/entities/Campaign';
import { NotificationEntity } from './NotificationEntity';

@Entity('campaigns')
@Index(['organizationId', 'status'])
@Index(['type', 'status'])
@Index(['channel'])
@Index(['createdBy'])
@Index(['createdAt'])
export class CampaignEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('varchar', { length: 255 })
  @Index()
  name: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: CampaignType
  })
  type: CampaignType;

  @Column({
    type: 'enum',
    enum: NotificationChannel
  })
  channel: NotificationChannel;

  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT
  })
  @Index()
  status: CampaignStatus;

  @Column('jsonb')
  audience: CampaignAudience;

  @Column('jsonb')
  content: CampaignContent;

  @Column('jsonb', { nullable: true })
  schedule?: CampaignSchedule;

  @Column('jsonb')
  settings: CampaignSettings;

  @Column('jsonb')
  metrics: CampaignMetrics;

  @Column('jsonb')
  metadata: CampaignMetadata;

  @Column('uuid')
  createdBy: string;

  @Column('uuid', { nullable: true })
  updatedBy?: string;

  @Column('uuid')
  @Index()
  organizationId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => NotificationEntity, notification => notification.campaign)
  notifications: NotificationEntity[];

  // Performance indexes
  @Column('timestamp', { nullable: true })
  @Index()
  startedAt?: Date;

  @Column('timestamp', { nullable: true })
  completedAt?: Date;

  @Column('timestamp', { nullable: true })
  @Index()
  scheduledStartDate?: Date;

  // Metrics for quick access
  @Column('int', { default: 0 })
  totalRecipients: number;

  @Column('int', { default: 0 })
  sentCount: number;

  @Column('int', { default: 0 })
  deliveredCount: number;

  @Column('int', { default: 0 })
  openedCount: number;

  @Column('int', { default: 0 })
  clickedCount: number;
}