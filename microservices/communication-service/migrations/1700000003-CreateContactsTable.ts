import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateContactsTable1700000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create contacts table
    await queryRunner.createTable(
      new Table({
        name: 'contacts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true
          },
          {
            name: 'externalId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'firstName',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'lastName',
            type: 'varchar',
            length: '100',
            isNullable: true
          },
          {
            name: 'fullName',
            type: 'varchar',
            length: '200',
            isNullable: true
          },
          {
            name: 'organizationId',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'channels',
            type: 'jsonb'
          },
          {
            name: 'preferences',
            type: 'jsonb',
            default: "'{}'"
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive', 'blocked', 'unsubscribed', 'bounced'],
            default: "'active'"
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: "'{}'"
          },
          {
            name: 'emailAddress',
            type: 'varchar',
            length: '255',
            isNullable: true
          },
          {
            name: 'phoneNumber',
            type: 'varchar',
            length: '50',
            isNullable: true
          },
          {
            name: 'whatsappNumber',
            type: 'varchar',
            length: '50',
            isNullable: true
          },
          {
            name: 'totalNotifications',
            type: 'int',
            default: 0
          },
          {
            name: 'successfulNotifications',
            type: 'int',
            default: 0
          },
          {
            name: 'failedNotifications',
            type: 'int',
            default: 0
          },
          {
            name: 'lastActivityAt',
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
    await queryRunner.createIndex('contacts', new Index({
      name: 'IDX_contacts_external_id',
      columnNames: ['externalId'],
      isUnique: true,
      where: 'externalId IS NOT NULL'
    }));

    await queryRunner.createIndex('contacts', new Index({
      name: 'IDX_contacts_organization',
      columnNames: ['organizationId']
    }));

    await queryRunner.createIndex('contacts', new Index({
      name: 'IDX_contacts_status',
      columnNames: ['status']
    }));

    await queryRunner.createIndex('contacts', new Index({
      name: 'IDX_contacts_created',
      columnNames: ['createdAt']
    }));

    await queryRunner.createIndex('contacts', new Index({
      name: 'IDX_contacts_email',
      columnNames: ['emailAddress']
    }));

    await queryRunner.createIndex('contacts', new Index({
      name: 'IDX_contacts_phone',
      columnNames: ['phoneNumber']
    }));

    await queryRunner.createIndex('contacts', new Index({
      name: 'IDX_contacts_whatsapp',
      columnNames: ['whatsappNumber']
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('contacts');
  }
}