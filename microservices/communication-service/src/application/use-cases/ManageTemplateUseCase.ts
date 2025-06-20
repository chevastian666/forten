import { Template, TemplateStatus, TemplateContent } from '../../domain/entities/Template';
import { NotificationChannel } from '../../domain/entities/Notification';
import { ITemplateRepository } from '../../domain/repositories/ITemplateRepository';
import { Logger } from '../interfaces/ILogger';
import { v4 as uuidv4 } from 'uuid';

export interface CreateTemplateInput {
  name: string;
  description?: string;
  channel: NotificationChannel;
  contents: TemplateContent[];
  defaultLocale?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  createdBy: string;
}

export interface UpdateTemplateInput {
  id: string;
  name?: string;
  description?: string;
  contents?: TemplateContent[];
  defaultLocale?: string;
  status?: TemplateStatus;
  category?: string;
  subcategory?: string;
  tags?: string[];
  updatedBy: string;
}

export interface CloneTemplateInput {
  templateId: string;
  name: string;
  createdBy: string;
}

export interface ApproveTemplateInput {
  templateId: string;
  approvedBy: string;
}

export class ManageTemplateUseCase {
  constructor(
    private templateRepository: ITemplateRepository,
    private logger: Logger
  ) {}

  async createTemplate(input: CreateTemplateInput): Promise<Template> {
    try {
      // Validate input
      this.validateCreateInput(input);

      // Check name uniqueness
      const isUnique = await this.templateRepository.checkNameUniqueness(input.name);
      if (!isUnique) {
        throw new Error('Template name already exists');
      }

      // Create template entity
      const template = new Template({
        id: uuidv4(),
        name: input.name,
        description: input.description,
        channel: input.channel,
        contents: input.contents,
        defaultLocale: input.defaultLocale || 'en',
        status: TemplateStatus.DRAFT,
        metadata: {
          category: input.category,
          subcategory: input.subcategory,
          version: 1
        },
        tags: input.tags,
        createdBy: input.createdBy
      });

      // Validate template contents
      for (const content of template.contents) {
        this.validateTemplateContent(content);
      }

      // Save template
      const savedTemplate = await this.templateRepository.create(template);

      this.logger.info('Template created', { 
        templateId: savedTemplate.id,
        name: savedTemplate.name,
        channel: savedTemplate.channel 
      });

      return savedTemplate;

    } catch (error) {
      this.logger.error('Failed to create template', { error, input });
      throw error;
    }
  }

  async updateTemplate(input: UpdateTemplateInput): Promise<Template> {
    try {
      // Get existing template
      const existingTemplate = await this.templateRepository.findById(input.id);
      if (!existingTemplate) {
        throw new Error('Template not found');
      }

      // Check if template is archived
      if (existingTemplate.status === TemplateStatus.ARCHIVED) {
        throw new Error('Cannot update archived template');
      }

      // Check name uniqueness if name is being changed
      if (input.name && input.name !== existingTemplate.name) {
        const isUnique = await this.templateRepository.checkNameUniqueness(input.name, input.id);
        if (!isUnique) {
          throw new Error('Template name already exists');
        }
      }

      // Validate contents if provided
      if (input.contents) {
        for (const content of input.contents) {
          this.validateTemplateContent(content);
        }
      }

      // Update template
      const updateData: Partial<Template> = {
        ...input,
        updatedBy: input.updatedBy,
        updatedAt: new Date()
      };

      if (input.category !== undefined || input.subcategory !== undefined) {
        updateData.metadata = {
          ...existingTemplate.metadata,
          category: input.category !== undefined ? input.category : existingTemplate.metadata.category,
          subcategory: input.subcategory !== undefined ? input.subcategory : existingTemplate.metadata.subcategory
        };
      }

      const updatedTemplate = await this.templateRepository.update(input.id, updateData);
      if (!updatedTemplate) {
        throw new Error('Failed to update template');
      }

      this.logger.info('Template updated', { 
        templateId: updatedTemplate.id,
        updatedBy: input.updatedBy 
      });

      return updatedTemplate;

    } catch (error) {
      this.logger.error('Failed to update template', { error, input });
      throw error;
    }
  }

  async cloneTemplate(input: CloneTemplateInput): Promise<Template> {
    try {
      // Get source template
      const sourceTemplate = await this.templateRepository.findById(input.templateId);
      if (!sourceTemplate) {
        throw new Error('Source template not found');
      }

      // Check name uniqueness
      const isUnique = await this.templateRepository.checkNameUniqueness(input.name);
      if (!isUnique) {
        throw new Error('Template name already exists');
      }

      // Clone template
      const clonedTemplate = sourceTemplate.clone();
      clonedTemplate.id = uuidv4();
      clonedTemplate.name = input.name;
      clonedTemplate.createdBy = input.createdBy;

      // Save cloned template
      const savedTemplate = await this.templateRepository.create(clonedTemplate);

      this.logger.info('Template cloned', { 
        sourceTemplateId: input.templateId,
        clonedTemplateId: savedTemplate.id,
        name: savedTemplate.name 
      });

      return savedTemplate;

    } catch (error) {
      this.logger.error('Failed to clone template', { error, input });
      throw error;
    }
  }

  async approveTemplate(input: ApproveTemplateInput): Promise<Template> {
    try {
      // Get template
      const template = await this.templateRepository.findById(input.templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Check if template can be approved
      if (template.status !== TemplateStatus.DRAFT && template.status !== TemplateStatus.INACTIVE) {
        throw new Error('Only draft or inactive templates can be approved');
      }

      // Validate template has content
      if (template.contents.length === 0) {
        throw new Error('Template must have at least one content');
      }

      // Approve template
      template.approve(input.approvedBy);

      // Update template
      const updatedTemplate = await this.templateRepository.update(template.id, template);
      if (!updatedTemplate) {
        throw new Error('Failed to approve template');
      }

      this.logger.info('Template approved', { 
        templateId: template.id,
        approvedBy: input.approvedBy 
      });

      return updatedTemplate;

    } catch (error) {
      this.logger.error('Failed to approve template', { error, input });
      throw error;
    }
  }

  async activateTemplate(templateId: string, userId: string): Promise<Template> {
    try {
      const template = await this.templateRepository.findById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      template.activate();
      template.updatedBy = userId;

      const updatedTemplate = await this.templateRepository.update(template.id, template);
      if (!updatedTemplate) {
        throw new Error('Failed to activate template');
      }

      this.logger.info('Template activated', { templateId, userId });

      return updatedTemplate;

    } catch (error) {
      this.logger.error('Failed to activate template', { error, templateId, userId });
      throw error;
    }
  }

  async deactivateTemplate(templateId: string, userId: string): Promise<Template> {
    try {
      const template = await this.templateRepository.findById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      template.deactivate();
      template.updatedBy = userId;

      const updatedTemplate = await this.templateRepository.update(template.id, template);
      if (!updatedTemplate) {
        throw new Error('Failed to deactivate template');
      }

      this.logger.info('Template deactivated', { templateId, userId });

      return updatedTemplate;

    } catch (error) {
      this.logger.error('Failed to deactivate template', { error, templateId, userId });
      throw error;
    }
  }

  async archiveTemplate(templateId: string, userId: string): Promise<Template> {
    try {
      const template = await this.templateRepository.findById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      template.archive();
      template.updatedBy = userId;

      const updatedTemplate = await this.templateRepository.update(template.id, template);
      if (!updatedTemplate) {
        throw new Error('Failed to archive template');
      }

      this.logger.info('Template archived', { templateId, userId });

      return updatedTemplate;

    } catch (error) {
      this.logger.error('Failed to archive template', { error, templateId, userId });
      throw error;
    }
  }

  async deleteTemplate(templateId: string, userId: string): Promise<boolean> {
    try {
      const template = await this.templateRepository.findById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Check if template is in use
      if (template.metadata.usageCount && template.metadata.usageCount > 0) {
        throw new Error('Cannot delete template that has been used. Archive it instead.');
      }

      const deleted = await this.templateRepository.delete(templateId);

      if (deleted) {
        this.logger.info('Template deleted', { templateId, userId });
      }

      return deleted;

    } catch (error) {
      this.logger.error('Failed to delete template', { error, templateId, userId });
      throw error;
    }
  }

  async getTemplateVersionHistory(templateId: string): Promise<Template[]> {
    try {
      const versions = await this.templateRepository.getVersionHistory(templateId);
      return versions;
    } catch (error) {
      this.logger.error('Failed to get template version history', { error, templateId });
      throw error;
    }
  }

  async revertToVersion(templateId: string, versionId: string, userId: string): Promise<Template> {
    try {
      const revertedTemplate = await this.templateRepository.revertToVersion(templateId, versionId);
      if (!revertedTemplate) {
        throw new Error('Failed to revert template');
      }

      revertedTemplate.updatedBy = userId;

      this.logger.info('Template reverted to version', { templateId, versionId, userId });

      return revertedTemplate;

    } catch (error) {
      this.logger.error('Failed to revert template', { error, templateId, versionId, userId });
      throw error;
    }
  }

  private validateCreateInput(input: CreateTemplateInput): void {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Template name is required');
    }

    if (!input.channel) {
      throw new Error('Channel is required');
    }

    if (!input.contents || input.contents.length === 0) {
      throw new Error('At least one content is required');
    }

    if (!input.createdBy) {
      throw new Error('Creator ID is required');
    }
  }

  private validateTemplateContent(content: TemplateContent): void {
    if (!content.body || content.body.trim().length === 0) {
      throw new Error('Template content body is required');
    }

    if (!content.locale || content.locale.trim().length === 0) {
      throw new Error('Template content locale is required');
    }

    // Validate variables
    if (content.variables) {
      const variableNames = new Set<string>();
      
      for (const variable of content.variables) {
        if (!variable.name || variable.name.trim().length === 0) {
          throw new Error('Variable name is required');
        }

        if (variableNames.has(variable.name)) {
          throw new Error(`Duplicate variable name: ${variable.name}`);
        }

        variableNames.add(variable.name);

        if (!['string', 'number', 'boolean', 'date', 'array', 'object'].includes(variable.type)) {
          throw new Error(`Invalid variable type: ${variable.type}`);
        }
      }
    }
  }
}