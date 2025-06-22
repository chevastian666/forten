import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateTemplatesTable1700000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create templates table
    await queryRunner.createTable(
      new Table({
        name: 'templates',
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
            name: 'channel',
            type: 'enum',
            enum: ['email', 'sms', 'whatsapp', 'push']
          },
          {
            name: 'contents',
            type: 'jsonb'
          },
          {
            name: 'defaultLocale',
            type: 'varchar',
            length: '10',
            default: "'en'"
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['draft', 'active', 'inactive', 'archived'],
            default: "'draft'"
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
            name: 'createdBy',
            type: 'uuid'
          },
          {
            name: 'updatedBy',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'parentId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'version',
            type: 'int',
            default: 1
          },
          {
            name: 'usageCount',
            type: 'int',
            default: 0
          },
          {
            name: 'lastUsedAt',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'approvedBy',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'approvedAt',
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
    await queryRunner.createIndex('templates', new Index({
      name: 'IDX_templates_name_channel',
      columnNames: ['name', 'channel'],
      isUnique: true
    }));

    await queryRunner.createIndex('templates', new Index({
      name: 'IDX_templates_status',
      columnNames: ['status']
    }));

    await queryRunner.createIndex('templates', new Index({
      name: 'IDX_templates_channel',
      columnNames: ['channel']
    }));

    await queryRunner.createIndex('templates', new Index({
      name: 'IDX_templates_created_by',
      columnNames: ['createdBy']
    }));

    await queryRunner.createIndex('templates', new Index({
      name: 'IDX_templates_parent',
      columnNames: ['parentId']
    }));

    await queryRunner.createIndex('templates', new Index({
      name: 'IDX_templates_name',
      columnNames: ['name']
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('templates');
  }
}