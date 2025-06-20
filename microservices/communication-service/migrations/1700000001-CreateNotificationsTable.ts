import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateNotificationsTable1700000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create notifications table
    await queryRunner.createTable(
      new Table({
        name: 'notifications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true
          },
          {
            name: 'channel',
            type: 'enum',
            enum: ['email', 'sms', 'whatsapp', 'push']
          },
          {
            name: 'recipientId',
            type: 'uuid'
          },
          {
            name: 'recipientAddress',
            type: 'varchar',
            length: '255'
          },
          {
            name: 'recipientName',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'senderId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'senderName',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'senderAddress',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'content',
            type: 'jsonb'
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'queued', 'sending', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked'],
            default: "'pending'"
          },
          {
            name: 'priority',
            type: 'enum',
            enum: ['low', 'medium', 'high', 'urgent'],
            default: "'medium'"
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: "'{}'"
          },
          {
            name: 'tags',
            type: 'text',
            isArray: true,
            isNullable: true
          },
          {
            name: 'campaignId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'templateId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'messageId',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'sentAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'deliveredAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'openedAt',
            type: 'timestamp',
            isNullable: true
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
    await queryRunner.createIndex('notifications', new Index({
      name: 'IDX_notifications_recipient',
      columnNames: ['recipientId', 'status']
    }));

    await queryRunner.createIndex('notifications', new Index({
      name: 'IDX_notifications_channel_status',
      columnNames: ['channel', 'status']
    }));

    await queryRunner.createIndex('notifications', new Index({
      name: 'IDX_notifications_campaign',
      columnNames: ['campaignId']
    }));

    await queryRunner.createIndex('notifications', new Index({
      name: 'IDX_notifications_created',
      columnNames: ['createdAt']
    }));

    await queryRunner.createIndex('notifications', new Index({
      name: 'IDX_notifications_scheduled',
      columnNames: ['metadata'],
      isUnique: false,
      where: "metadata->>'scheduledAt' IS NOT NULL"
    }));

    await queryRunner.createIndex('notifications', new Index({
      name: 'IDX_notifications_message_id',
      columnNames: ['messageId']
    }));

    await queryRunner.createIndex('notifications', new Index({
      name: 'IDX_notifications_sent_at',
      columnNames: ['sentAt']
    }));

    await queryRunner.createIndex('notifications', new Index({
      name: 'IDX_notifications_delivered_at',
      columnNames: ['deliveredAt']
    }));

    await queryRunner.createIndex('notifications', new Index({
      name: 'IDX_notifications_opened_at',
      columnNames: ['openedAt']
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('notifications');
  }
}