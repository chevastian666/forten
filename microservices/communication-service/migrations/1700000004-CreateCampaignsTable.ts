import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateCampaignsTable1700000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create campaigns table
    await queryRunner.createTable(
      new Table({
        name: 'campaigns',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255'
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['immediate', 'scheduled', 'recurring', 'triggered']
          },
          {
            name: 'channel',
            type: 'enum',
            enum: ['email', 'sms', 'whatsapp', 'push']
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled', 'failed'],
            default: "'draft'"
          },
          {
            name: 'audience',
            type: 'jsonb'
          },
          {
            name: 'content',
            type: 'jsonb'
          },
          {
            name: 'schedule',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'settings',
            type: 'jsonb'
          },
          {
            name: 'metrics',
            type: 'jsonb',
            default: "'{}'"
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: "'{}'"
          },
          {
            name: 'createdBy',
            type: 'uuid'
          },
          {
            name: 'updatedBy',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'organizationId',
            type: 'uuid'
          },
          {
            name: 'startedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'scheduledStartDate',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'totalRecipients',
            type: 'int',
            default: 0
          },
          {
            name: 'sentCount',
            type: 'int',
            default: 0
          },
          {
            name: 'deliveredCount',
            type: 'int',
            default: 0
          },
          {
            name: 'openedCount',
            type: 'int',
            default: 0
          },
          {
            name: 'clickedCount',
            type: 'int',
            default: 0
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ]
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex('campaigns', new Index({
      name: 'IDX_campaigns_organization_status',
      columnNames: ['organizationId', 'status']
    }));

    await queryRunner.createIndex('campaigns', new Index({
      name: 'IDX_campaigns_type_status',
      columnNames: ['type', 'status']
    }));

    await queryRunner.createIndex('campaigns', new Index({
      name: 'IDX_campaigns_channel',
      columnNames: ['channel']
    }));

    await queryRunner.createIndex('campaigns', new Index({
      name: 'IDX_campaigns_created_by',
      columnNames: ['createdBy']
    }));

    await queryRunner.createIndex('campaigns', new Index({
      name: 'IDX_campaigns_created',
      columnNames: ['createdAt']
    }));

    await queryRunner.createIndex('campaigns', new Index({
      name: 'IDX_campaigns_name',
      columnNames: ['name']
    }));

    await queryRunner.createIndex('campaigns', new Index({
      name: 'IDX_campaigns_status',
      columnNames: ['status']
    }));

    await queryRunner.createIndex('campaigns', new Index({
      name: 'IDX_campaigns_organization',
      columnNames: ['organizationId']
    }));

    await queryRunner.createIndex('campaigns', new Index({
      name: 'IDX_campaigns_started',
      columnNames: ['startedAt']
    }));

    await queryRunner.createIndex('campaigns', new Index({
      name: 'IDX_campaigns_scheduled_start',
      columnNames: ['scheduledStartDate']
    }));

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE notifications 
      ADD CONSTRAINT FK_notifications_campaign 
      FOREIGN KEY (campaignId) 
      REFERENCES campaigns(id) 
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE notifications 
      ADD CONSTRAINT FK_notifications_template 
      FOREIGN KEY (templateId) 
      REFERENCES templates(id) 
      ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query('ALTER TABLE notifications DROP CONSTRAINT FK_notifications_campaign');
    await queryRunner.query('ALTER TABLE notifications DROP CONSTRAINT FK_notifications_template');
    
    await queryRunner.dropTable('campaigns');
  }
}