import { NotificationChannel } from './Notification';

export enum ContactStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
  UNSUBSCRIBED = 'unsubscribed',
  BOUNCED = 'bounced'
}

export interface ContactChannel {
  channel: NotificationChannel;
  address: string;
  verified: boolean;
  verifiedAt?: Date;
  status: ContactStatus;
  preferences?: ChannelPreferences;
  metadata?: Record<string, any>;
}

export interface ChannelPreferences {
  enabled: boolean;
  quietHours?: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
    timezone: string;
  };
  frequency?: {
    max: number;
    period: 'hour' | 'day' | 'week' | 'month';
  };
  categories?: string[]; // Allowed notification categories
  language?: string;
}

export interface ContactPreferences {
  timezone?: string;
  language?: string;
  marketingOptIn?: boolean;
  transactionalOptIn?: boolean;
  categories?: {
    [category: string]: boolean;
  };
  doNotDisturb?: {
    enabled: boolean;
    start?: string; // HH:mm format
    end?: string;   // HH:mm format
  };
}

export interface ContactMetadata {
  source?: string;
  sourceId?: string;
  importedAt?: Date;
  lastActivityAt?: Date;
  totalNotifications?: number;
  successfulNotifications?: number;
  failedNotifications?: number;
  tags?: string[];
  customFields?: Record<string, any>;
}

export class Contact {
  id: string;
  externalId?: string; // Reference to user in main system
  firstName?: string;
  lastName?: string;
  fullName?: string;
  organizationId?: string;
  channels: ContactChannel[];
  preferences: ContactPreferences;
  status: ContactStatus;
  metadata: ContactMetadata;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<Contact>) {
    this.id = data.id || '';
    this.externalId = data.externalId;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.fullName = data.fullName || this.getFullName();
    this.organizationId = data.organizationId;
    this.channels = data.channels || [];
    this.preferences = data.preferences || {};
    this.status = data.status || ContactStatus.ACTIVE;
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  getFullName(): string {
    if (this.fullName) return this.fullName;
    const parts = [this.firstName, this.lastName].filter(Boolean);
    return parts.join(' ') || '';
  }

  getChannel(channel: NotificationChannel): ContactChannel | undefined {
    return this.channels.find(c => c.channel === channel);
  }

  getActiveChannels(): ContactChannel[] {
    return this.channels.filter(c => 
      c.status === ContactStatus.ACTIVE && 
      c.verified &&
      (c.preferences?.enabled !== false)
    );
  }

  addChannel(channel: ContactChannel): void {
    const existingIndex = this.channels.findIndex(c => c.channel === channel.channel);
    if (existingIndex >= 0) {
      this.channels[existingIndex] = channel;
    } else {
      this.channels.push(channel);
    }
    this.updatedAt = new Date();
  }

  removeChannel(channelType: NotificationChannel): void {
    this.channels = this.channels.filter(c => c.channel !== channelType);
    this.updatedAt = new Date();
  }

  updateChannelStatus(channelType: NotificationChannel, status: ContactStatus): void {
    const channel = this.getChannel(channelType);
    if (channel) {
      channel.status = status;
      this.updatedAt = new Date();
    }
  }

  verifyChannel(channelType: NotificationChannel): void {
    const channel = this.getChannel(channelType);
    if (channel) {
      channel.verified = true;
      channel.verifiedAt = new Date();
      this.updatedAt = new Date();
    }
  }

  canReceiveNotification(
    channel: NotificationChannel, 
    category?: string,
    now: Date = new Date()
  ): { allowed: boolean; reason?: string } {
    // Check contact status
    if (this.status !== ContactStatus.ACTIVE) {
      return { allowed: false, reason: `Contact is ${this.status}` };
    }

    // Check channel availability
    const contactChannel = this.getChannel(channel);
    if (!contactChannel) {
      return { allowed: false, reason: 'Channel not configured' };
    }

    // Check channel status
    if (contactChannel.status !== ContactStatus.ACTIVE) {
      return { allowed: false, reason: `Channel is ${contactChannel.status}` };
    }

    // Check channel verification
    if (!contactChannel.verified) {
      return { allowed: false, reason: 'Channel not verified' };
    }

    // Check channel preferences
    if (contactChannel.preferences?.enabled === false) {
      return { allowed: false, reason: 'Channel disabled by user' };
    }

    // Check category preferences
    if (category) {
      // Channel-specific categories
      if (contactChannel.preferences?.categories && 
          !contactChannel.preferences.categories.includes(category)) {
        return { allowed: false, reason: `Category '${category}' not allowed for channel` };
      }

      // Global category preferences
      if (this.preferences.categories && 
          this.preferences.categories[category] === false) {
        return { allowed: false, reason: `Category '${category}' disabled by user` };
      }
    }

    // Check quiet hours
    if (this.isInQuietHours(channel, now)) {
      return { allowed: false, reason: 'In quiet hours' };
    }

    // Check global do not disturb
    if (this.preferences.doNotDisturb?.enabled && this.isInDoNotDisturb(now)) {
      return { allowed: false, reason: 'Do not disturb enabled' };
    }

    return { allowed: true };
  }

  private isInQuietHours(channel: NotificationChannel, now: Date): boolean {
    const contactChannel = this.getChannel(channel);
    const quietHours = contactChannel?.preferences?.quietHours;
    
    if (!quietHours) return false;

    // TODO: Implement timezone-aware quiet hours check
    // This is a simplified version
    const currentTime = now.toTimeString().slice(0, 5); // HH:mm format
    
    if (quietHours.start <= quietHours.end) {
      // Normal case: quiet hours don't cross midnight
      return currentTime >= quietHours.start && currentTime <= quietHours.end;
    } else {
      // Quiet hours cross midnight
      return currentTime >= quietHours.start || currentTime <= quietHours.end;
    }
  }

  private isInDoNotDisturb(now: Date): boolean {
    const dnd = this.preferences.doNotDisturb;
    if (!dnd?.enabled || !dnd.start || !dnd.end) return false;

    const currentTime = now.toTimeString().slice(0, 5); // HH:mm format
    
    if (dnd.start <= dnd.end) {
      return currentTime >= dnd.start && currentTime <= dnd.end;
    } else {
      return currentTime >= dnd.start || currentTime <= dnd.end;
    }
  }

  updateActivity(): void {
    this.metadata.lastActivityAt = new Date();
    this.updatedAt = new Date();
  }

  incrementNotificationCount(success: boolean): void {
    this.metadata.totalNotifications = (this.metadata.totalNotifications || 0) + 1;
    if (success) {
      this.metadata.successfulNotifications = (this.metadata.successfulNotifications || 0) + 1;
    } else {
      this.metadata.failedNotifications = (this.metadata.failedNotifications || 0) + 1;
    }
    this.updateActivity();
  }

  unsubscribe(channel?: NotificationChannel): void {
    if (channel) {
      this.updateChannelStatus(channel, ContactStatus.UNSUBSCRIBED);
    } else {
      this.status = ContactStatus.UNSUBSCRIBED;
      this.channels.forEach(c => c.status = ContactStatus.UNSUBSCRIBED);
    }
    this.updatedAt = new Date();
  }

  block(): void {
    this.status = ContactStatus.BLOCKED;
    this.updatedAt = new Date();
  }

  activate(): void {
    this.status = ContactStatus.ACTIVE;
    this.updatedAt = new Date();
  }
}