import { Contact, ContactStatus } from '../entities/Contact';
import { NotificationChannel } from '../entities/Notification';
import { PaginatedResult, PaginationOptions } from './INotificationRepository';

export interface ContactFilter {
  ids?: string[];
  externalIds?: string[];
  organizationId?: string;
  status?: ContactStatus | ContactStatus[];
  channel?: NotificationChannel;
  verified?: boolean;
  tags?: string[];
  searchTerm?: string; // Search in name, email, phone
  hasChannel?: NotificationChannel;
  marketingOptIn?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface ContactChannelUpdate {
  channel: NotificationChannel;
  address: string;
  verified?: boolean;
  status?: ContactStatus;
  preferences?: any;
}

export interface IContactRepository {
  create(contact: Contact): Promise<Contact>;
  createBatch(contacts: Contact[]): Promise<Contact[]>;
  findById(id: string): Promise<Contact | null>;
  findByIds(ids: string[]): Promise<Contact[]>;
  findByExternalId(externalId: string): Promise<Contact | null>;
  findByChannelAddress(channel: NotificationChannel, address: string): Promise<Contact | null>;
  find(filter: ContactFilter, options?: PaginationOptions): Promise<PaginatedResult<Contact>>;
  update(id: string, contact: Partial<Contact>): Promise<Contact | null>;
  updateBatch(updates: { id: string; data: Partial<Contact> }[]): Promise<void>;
  delete(id: string): Promise<boolean>;
  deleteBatch(ids: string[]): Promise<number>;
  
  // Channel management
  addChannel(contactId: string, channel: ContactChannelUpdate): Promise<Contact | null>;
  updateChannel(contactId: string, channelType: NotificationChannel, updates: Partial<ContactChannelUpdate>): Promise<Contact | null>;
  removeChannel(contactId: string, channelType: NotificationChannel): Promise<Contact | null>;
  
  // Preference management
  updatePreferences(id: string, preferences: Partial<Contact['preferences']>): Promise<Contact | null>;
  
  // Subscription management
  unsubscribe(id: string, channel?: NotificationChannel): Promise<Contact | null>;
  resubscribe(id: string, channel?: NotificationChannel): Promise<Contact | null>;
  
  // Analytics
  countByStatus(filter: ContactFilter): Promise<Record<ContactStatus, number>>;
  getChannelDistribution(organizationId?: string): Promise<Record<NotificationChannel, number>>;
  
  // Bulk operations
  bulkUnsubscribe(ids: string[], channel?: NotificationChannel): Promise<number>;
  bulkUpdateStatus(ids: string[], status: ContactStatus): Promise<number>;
}