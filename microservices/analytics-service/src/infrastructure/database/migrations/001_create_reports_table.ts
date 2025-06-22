import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create reports table
  await knex.schema.createTable('reports', (table) => {
    table.string('id').primary();
    table.enum('type', [
      'SALES',
      'INVENTORY',
      'FINANCIAL',
      'CUSTOMER',
      'PERFORMANCE',
      'CUSTOM'
    ]).notNullable();
    table.string('name').notNullable();
    table.text('description');
    table.enum('format', ['PDF', 'EXCEL', 'CSV', 'JSON']).notNullable();
    table.jsonb('parameters').notNullable();
    table.enum('status', [
      'PENDING',
      'PROCESSING',
      'COMPLETED',
      'FAILED',
      'SCHEDULED'
    ]).notNullable();
    table.string('created_by').notNullable();
    table.jsonb('schedule');
    table.string('file_url');
    table.text('error');
    table.timestamp('processed_at');
    table.timestamps(true, true);

    // Indexes
    table.index('status');
    table.index('created_by');
    table.index('type');
    table.index('created_at');
  });

  // Create report_recipients table
  await knex.schema.createTable('report_recipients', (table) => {
    table.increments('id');
    table.string('report_id').notNullable();
    table.string('email').notNullable();
    table.timestamp('sent_at');
    table.enum('status', ['pending', 'sent', 'failed']).defaultTo('pending');
    table.text('error');
    
    table.foreign('report_id').references('id').inTable('reports').onDelete('CASCADE');
    table.index(['report_id', 'status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('report_recipients');
  await knex.schema.dropTableIfExists('reports');
}