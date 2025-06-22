import { Campaign, CampaignStatus, CampaignType, CampaignAudience, CampaignContent, CampaignSchedule, CampaignSettings } from '../../domain/entities/Campaign';
import { NotificationChannel } from '../../domain/entities/Notification';
import { ICampaignRepository } from '../../domain/repositories/ICampaignRepository';
import { IContactRepository } from '../../domain/repositories/IContactRepository';
import { ITemplateRepository } from '../../domain/repositories/ITemplateRepository';
import { IQueueService } from '../interfaces/IQueueService';
import { Logger } from '../interfaces/ILogger';
import { v4 as uuidv4 } from 'uuid';

export interface CreateCampaignInput {
  name: string;
  description?: string;
  type: CampaignType;
  channel: NotificationChannel;
  audience: CampaignAudience;
  content: CampaignContent;
  schedule?: CampaignSchedule;
  settings?: CampaignSettings;
  category?: string;
  tags?: string[];
  organizationId: string;
  createdBy: string;
}

export interface UpdateCampaignInput {
  id: string;
  name?: string;
  description?: string;
  audience?: CampaignAudience;
  content?: CampaignContent;
  schedule?: CampaignSchedule;
  settings?: CampaignSettings;
  category?: string;
  tags?: string[];
  updatedBy: string;
}

export interface StartCampaignInput {
  campaignId: string;
  userId: string;
}

export interface CampaignTestInput {
  campaignId: string;
  testRecipients: string[];
  userId: string;
}

export class ManageCampaignUseCase {
  constructor(
    private campaignRepository: ICampaignRepository,
    private contactRepository: IContactRepository,
    private templateRepository: ITemplateRepository,
    private queueService: IQueueService,
    private logger: Logger
  ) {}

  async createCampaign(input: CreateCampaignInput): Promise<Campaign> {
    try {
      // Validate input
      await this.validateCreateInput(input);

      // Estimate audience size
      const audienceSize = await this.estimateAudienceSize(input.audience, input.organizationId);

      // Create campaign entity
      const campaign = new Campaign({
        id: uuidv4(),
        name: input.name,
        description: input.description,
        type: input.type,
        channel: input.channel,
        status: CampaignStatus.DRAFT,
        audience: {
          ...input.audience,
          estimatedSize: audienceSize
        },
        content: input.content,
        schedule: input.schedule,
        settings: input.settings || {
          priority: 'medium',
          respectQuietHours: true,
          tracking: {
            opens: true,
            clicks: true,
            conversions: false
          }
        },
        metadata: {
          category: input.category,
          tags: input.tags
        },
        organizationId: input.organizationId,
        createdBy: input.createdBy,
        metrics: {
          totalRecipients: audienceSize,
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          failed: 0,
          unsubscribed: 0
        }
      });

      // Save campaign
      const savedCampaign = await this.campaignRepository.create(campaign);

      this.logger.info('Campaign created', { 
        campaignId: savedCampaign.id,
        name: savedCampaign.name,
        type: savedCampaign.type,
        audienceSize 
      });

      return savedCampaign;

    } catch (error) {
      this.logger.error('Failed to create campaign', { error, input });
      throw error;
    }
  }

  async updateCampaign(input: UpdateCampaignInput): Promise<Campaign> {
    try {
      // Get existing campaign
      const existingCampaign = await this.campaignRepository.findById(input.id);
      if (!existingCampaign) {
        throw new Error('Campaign not found');
      }

      // Check if campaign can be updated
      if (existingCampaign.status === CampaignStatus.RUNNING || 
          existingCampaign.status === CampaignStatus.COMPLETED) {
        throw new Error(`Cannot update campaign in ${existingCampaign.status} status`);
      }

      // Validate updates
      if (input.content) {
        await this.validateContent(input.content, existingCampaign.channel);
      }

      // Re-estimate audience size if audience changed
      let audienceSize = existingCampaign.audience.estimatedSize;
      if (input.audience) {
        audienceSize = await this.estimateAudienceSize(input.audience, existingCampaign.organizationId);
      }

      // Update campaign
      const updateData: Partial<Campaign> = {
        ...input,
        updatedBy: input.updatedBy,
        updatedAt: new Date()
      };

      if (input.audience) {
        updateData.audience = {
          ...input.audience,
          estimatedSize: audienceSize
        };
        updateData.metrics = {
          ...existingCampaign.metrics,
          totalRecipients: audienceSize
        };
      }

      const updatedCampaign = await this.campaignRepository.update(input.id, updateData);
      if (!updatedCampaign) {
        throw new Error('Failed to update campaign');
      }

      this.logger.info('Campaign updated', { 
        campaignId: updatedCampaign.id,
        updatedBy: input.updatedBy 
      });

      return updatedCampaign;

    } catch (error) {
      this.logger.error('Failed to update campaign', { error, input });
      throw error;
    }
  }

  async startCampaign(input: StartCampaignInput): Promise<Campaign> {
    try {
      // Get campaign
      const campaign = await this.campaignRepository.findById(input.campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Check if campaign can be started
      const canStart = campaign.canStart();
      if (!canStart.allowed) {
        throw new Error(canStart.reason);
      }

      // Start campaign
      campaign.start();
      const updatedCampaign = await this.campaignRepository.update(campaign.id, campaign);
      if (!updatedCampaign) {
        throw new Error('Failed to start campaign');
      }

      // Queue campaign for processing
      if (campaign.type === CampaignType.IMMEDIATE) {
        await this.queueService.queueCampaign(updatedCampaign);
      } else if (campaign.type === CampaignType.SCHEDULED && campaign.schedule) {
        await this.queueService.scheduleCampaign(updatedCampaign, campaign.schedule.startDate);
      }

      this.logger.info('Campaign started', { 
        campaignId: campaign.id,
        type: campaign.type,
        userId: input.userId 
      });

      return updatedCampaign;

    } catch (error) {
      this.logger.error('Failed to start campaign', { error, input });
      throw error;
    }
  }

  async pauseCampaign(campaignId: string, userId: string): Promise<Campaign> {
    try {
      const campaign = await this.campaignRepository.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      campaign.pause();
      const updatedCampaign = await this.campaignRepository.update(campaign.id, campaign);
      if (!updatedCampaign) {
        throw new Error('Failed to pause campaign');
      }

      // Remove from queue
      await this.queueService.removeCampaign(campaignId);

      this.logger.info('Campaign paused', { campaignId, userId });

      return updatedCampaign;

    } catch (error) {
      this.logger.error('Failed to pause campaign', { error, campaignId, userId });
      throw error;
    }
  }

  async resumeCampaign(campaignId: string, userId: string): Promise<Campaign> {
    try {
      const campaign = await this.campaignRepository.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      campaign.resume();
      const updatedCampaign = await this.campaignRepository.update(campaign.id, campaign);
      if (!updatedCampaign) {
        throw new Error('Failed to resume campaign');
      }

      // Re-queue campaign
      await this.queueService.queueCampaign(updatedCampaign);

      this.logger.info('Campaign resumed', { campaignId, userId });

      return updatedCampaign;

    } catch (error) {
      this.logger.error('Failed to resume campaign', { error, campaignId, userId });
      throw error;
    }
  }

  async cancelCampaign(campaignId: string, userId: string): Promise<Campaign> {
    try {
      const campaign = await this.campaignRepository.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      campaign.cancel();
      const updatedCampaign = await this.campaignRepository.update(campaign.id, campaign);
      if (!updatedCampaign) {
        throw new Error('Failed to cancel campaign');
      }

      // Remove from queue
      await this.queueService.removeCampaign(campaignId);

      this.logger.info('Campaign cancelled', { campaignId, userId });

      return updatedCampaign;

    } catch (error) {
      this.logger.error('Failed to cancel campaign', { error, campaignId, userId });
      throw error;
    }
  }

  async cloneCampaign(campaignId: string, name: string, userId: string): Promise<Campaign> {
    try {
      const sourceCampaign = await this.campaignRepository.findById(campaignId);
      if (!sourceCampaign) {
        throw new Error('Source campaign not found');
      }

      const clonedCampaign = sourceCampaign.clone();
      clonedCampaign.id = uuidv4();
      clonedCampaign.name = name;
      clonedCampaign.createdBy = userId;

      const savedCampaign = await this.campaignRepository.create(clonedCampaign);

      this.logger.info('Campaign cloned', { 
        sourceCampaignId: campaignId,
        clonedCampaignId: savedCampaign.id,
        name: savedCampaign.name,
        userId 
      });

      return savedCampaign;

    } catch (error) {
      this.logger.error('Failed to clone campaign', { error, campaignId, name, userId });
      throw error;
    }
  }

  async testCampaign(input: CampaignTestInput): Promise<{ sent: number; failed: number }> {
    try {
      const campaign = await this.campaignRepository.findById(input.campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Validate test recipients
      const validRecipients = await this.validateTestRecipients(
        input.testRecipients,
        campaign.channel,
        campaign.organizationId
      );

      if (validRecipients.length === 0) {
        throw new Error('No valid test recipients found');
      }

      // Create test campaign
      const testCampaign = new Campaign({
        ...campaign,
        id: uuidv4(),
        name: `[TEST] ${campaign.name}`,
        status: CampaignStatus.RUNNING,
        audience: {
          type: 'list',
          contactIds: validRecipients,
          estimatedSize: validRecipients.length
        },
        metadata: {
          ...campaign.metadata,
          notes: `Test campaign for ${campaign.id}`
        }
      });

      // Send test notifications
      await this.queueService.queueCampaign(testCampaign);

      this.logger.info('Campaign test sent', { 
        campaignId: input.campaignId,
        testRecipients: validRecipients.length,
        userId: input.userId 
      });

      return {
        sent: validRecipients.length,
        failed: input.testRecipients.length - validRecipients.length
      };

    } catch (error) {
      this.logger.error('Failed to test campaign', { error, input });
      throw error;
    }
  }

  async deleteCampaign(campaignId: string, userId: string): Promise<boolean> {
    try {
      const campaign = await this.campaignRepository.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (campaign.status === CampaignStatus.RUNNING) {
        throw new Error('Cannot delete running campaign');
      }

      const deleted = await this.campaignRepository.delete(campaignId);

      if (deleted) {
        this.logger.info('Campaign deleted', { campaignId, userId });
      }

      return deleted;

    } catch (error) {
      this.logger.error('Failed to delete campaign', { error, campaignId, userId });
      throw error;
    }
  }

  private async validateCreateInput(input: CreateCampaignInput): Promise<void> {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Campaign name is required');
    }

    if (!input.channel) {
      throw new Error('Channel is required');
    }

    if (!input.organizationId) {
      throw new Error('Organization ID is required');
    }

    if (!input.createdBy) {
      throw new Error('Creator ID is required');
    }

    await this.validateContent(input.content, input.channel);

    if (input.type === CampaignType.SCHEDULED && !input.schedule?.startDate) {
      throw new Error('Start date is required for scheduled campaigns');
    }

    if (input.type === CampaignType.RECURRING && !input.schedule?.recurrence) {
      throw new Error('Recurrence settings are required for recurring campaigns');
    }
  }

  private async validateContent(content: CampaignContent, channel: NotificationChannel): Promise<void> {
    if (!content.templateId) {
      throw new Error('Template is required');
    }

    const template = await this.templateRepository.findById(content.templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    if (template.channel !== channel) {
      throw new Error('Template channel does not match campaign channel');
    }

    if (template.status !== 'active') {
      throw new Error('Template must be active');
    }
  }

  private async estimateAudienceSize(
    audience: CampaignAudience,
    organizationId: string
  ): Promise<number> {
    switch (audience.type) {
      case 'all':
        const allContacts = await this.contactRepository.find(
          { organizationId, status: 'active' },
          { page: 1, limit: 1 }
        );
        return allContacts.total - (audience.excludeIds?.length || 0);

      case 'list':
        return (audience.contactIds?.length || 0) - (audience.excludeIds?.length || 0);

      case 'segment':
        // TODO: Implement segment size calculation
        return 0;

      case 'query':
        // TODO: Implement query-based audience size calculation
        return 0;

      default:
        return 0;
    }
  }

  private async validateTestRecipients(
    recipientIds: string[],
    channel: NotificationChannel,
    organizationId: string
  ): Promise<string[]> {
    const validRecipients: string[] = [];

    for (const recipientId of recipientIds) {
      const contact = await this.contactRepository.findById(recipientId);
      
      if (contact && 
          contact.organizationId === organizationId &&
          contact.canReceiveNotification(channel).allowed) {
        validRecipients.push(recipientId);
      }
    }

    return validRecipients;
  }
}