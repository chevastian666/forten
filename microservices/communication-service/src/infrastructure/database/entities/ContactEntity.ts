import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { ContactStatus, ContactChannel, ContactPreferences, ContactMetadata } from '../../../domain/entities/Contact';

@Entity('contacts')
@Index(['externalId'], { unique: true, where: 'externalId IS NOT NULL' })
@Index(['organizationId'])
@Index(['status'])
@Index(['createdAt'])
export class ContactEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  externalId?: string;

  @Column('varchar', { length: 100, nullable: true })
  firstName?: string;

  @Column('varchar', { length: 100, nullable: true })
  lastName?: string;

  @Column('varchar', { length: 200, nullable: true })
  fullName?: string;

  @Column('uuid', { nullable: true })
  @Index()
  organizationId?: string;

  @Column('jsonb')
  channels: ContactChannel[];

  @Column('jsonb')
  preferences: ContactPreferences;

  @Column({
    type: 'enum',
    enum: ContactStatus,
    default: ContactStatus.ACTIVE
  })
  status: ContactStatus;

  @Column('jsonb')
  metadata: ContactMetadata;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Indexes for channel searches
  @Index()
  @Column('varchar', { length: 255, nullable: true })
  emailAddress?: string;

  @Index()
  @Column('varchar', { length: 50, nullable: true })
  phoneNumber?: string;

  @Index()
  @Column('varchar', { length: 50, nullable: true })
  whatsappNumber?: string;

  // Analytics
  @Column('int', { default: 0 })
  totalNotifications: number;

  @Column('int', { default: 0 })
  successfulNotifications: number;

  @Column('int', { default: 0 })
  failedNotifications: number;

  @Column('timestamp', { nullable: true })
  lastActivityAt?: Date;
}