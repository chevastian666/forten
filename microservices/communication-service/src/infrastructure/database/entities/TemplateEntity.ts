import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { NotificationChannel } from '../../../domain/entities/Notification';
import { TemplateStatus, TemplateContent, TemplateMetadata } from '../../../domain/entities/Template';
import { NotificationEntity } from './NotificationEntity';

@Entity('templates')
@Index(['name', 'channel'], { unique: true })
@Index(['status'])
@Index(['channel'])
@Index(['createdBy'])
export class TemplateEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('varchar', { length: 255 })
  @Index()
  name: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: NotificationChannel
  })
  channel: NotificationChannel;

  @Column('jsonb')
  contents: TemplateContent[];

  @Column('varchar', { length: 10, default: 'en' })
  defaultLocale: string;

  @Column({
    type: 'enum',
    enum: TemplateStatus,
    default: TemplateStatus.DRAFT
  })
  status: TemplateStatus;

  @Column('jsonb')
  metadata: TemplateMetadata;

  @Column('text', { array: true, nullable: true })
  tags?: string[];

  @Column('uuid')
  createdBy: string;

  @Column('uuid', { nullable: true })
  updatedBy?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => NotificationEntity, notification => notification.template)
  notifications: NotificationEntity[];

  // Version control
  @Column('uuid', { nullable: true })
  @Index()
  parentId?: string;

  @Column('int', { default: 1 })
  version: number;

  // Usage tracking
  @Column('int', { default: 0 })
  usageCount: number;

  @Column('timestamp', { nullable: true })
  lastUsedAt?: Date;

  // Approval
  @Column('uuid', { nullable: true })
  approvedBy?: string;

  @Column('timestamp', { nullable: true })
  approvedAt?: Date;
}