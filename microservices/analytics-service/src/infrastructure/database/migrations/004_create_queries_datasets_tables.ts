import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create queries table
  await knex.schema.createTable('queries', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.jsonb('definition').notNullable();
    table.string('created_by').notNullable();
    table.boolean('is_public').defaultTo(false);
    table.specificType('tags', 'text[]').defaultTo('{}');
    table.string('category').notNullable();
    table.integer('cache_duration'); // in seconds
    table.timestamp('last_executed');
    table.integer('execution_count').defaultTo(0);
    table.decimal('average_execution_time', 10, 2).defaultTo(0);
    table.timestamps(true, true);

    // Indexes
    table.index('category');
    table.index('created_by');
    table.index('is_public');
    table.index('tags', 'GIN');
    table.index('last_executed');
  });

  // Create query_executions table
  await knex.schema.createTable('query_executions', (table) => {
    table.increments('id');
    table.string('query_id').notNullable();
    table.string('executed_by').notNullable();
    table.timestamp('executed_at').defaultTo(knex.fn.now());
    table.integer('execution_time'); // in milliseconds
    table.integer('row_count');
    table.jsonb('parameters');
    table.boolean('cache_hit').defaultTo(false);
    table.text('error');

    table.foreign('query_id').references('id').inTable('queries').onDelete('CASCADE');
    table.index(['query_id', 'executed_at']);
    table.index('executed_by');
  });

  // Create datasets table
  await knex.schema.createTable('datasets', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.jsonb('source').notNullable();
    table.jsonb('schema').defaultTo('[]');
    table.enum('status', [
      'DRAFT',
      'ACTIVE',
      'PROCESSING',
      'ARCHIVED',
      'ERROR'
    ]).notNullable();
    table.string('created_by').notNullable();
    table.jsonb('transformations').defaultTo('[]');
    table.jsonb('refresh_config');
    table.jsonb('metadata');
    table.jsonb('permissions');
    table.integer('version').defaultTo(1);
    table.string('parent_dataset_id');
    table.timestamps(true, true);

    // Indexes
    table.index('status');
    table.index('created_by');
    table.index('parent_dataset_id');
  });

  // Create dataset_versions table
  await knex.schema.createTable('dataset_versions', (table) => {
    table.increments('id');
    table.string('dataset_id').notNullable();
    table.integer('version').notNullable();
    table.jsonb('schema').notNullable();
    table.jsonb('transformations');
    table.string('created_by').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.text('change_description');

    table.foreign('dataset_id').references('id').inTable('datasets').onDelete('CASCADE');
    table.unique(['dataset_id', 'version']);
    table.index('created_at');
  });

  // Create dataset_data table (for smaller datasets)
  await knex.schema.createTable('dataset_data', (table) => {
    table.string('dataset_id').notNullable();
    table.uuid('row_id').defaultTo(knex.raw('gen_random_uuid()'));
    table.jsonb('data').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.primary(['dataset_id', 'row_id']);
    table.foreign('dataset_id').references('id').inTable('datasets').onDelete('CASCADE');
    table.index('created_at');
    table.index('updated_at');
  });

  // Create data_sources table
  await knex.schema.createTable('data_sources', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.enum('type', [
      'POSTGRESQL',
      'MYSQL',
      'MONGODB',
      'ELASTICSEARCH',
      'API',
      'FILE',
      'STREAM'
    ]).notNullable();
    table.jsonb('connection_config'); // Encrypted in application
    table.boolean('is_active').defaultTo(true);
    table.string('created_by').notNullable();
    table.timestamp('last_tested');
    table.enum('last_test_status', ['success', 'failed']);
    table.text('last_test_error');
    table.timestamps(true, true);

    table.index('type');
    table.index('is_active');
  });

  // Create etl_jobs table
  await knex.schema.createTable('etl_jobs', (table) => {
    table.string('id').primary();
    table.string('dataset_id').notNullable();
    table.enum('type', ['extract', 'transform', 'load', 'full']).notNullable();
    table.jsonb('config').notNullable();
    table.enum('status', [
      'pending',
      'running',
      'completed',
      'failed',
      'cancelled'
    ]).defaultTo('pending');
    table.timestamp('started_at');
    table.timestamp('completed_at');
    table.integer('processed_records').defaultTo(0);
    table.integer('failed_records').defaultTo(0);
    table.jsonb('errors');
    table.string('created_by').notNullable();
    table.timestamps(true, true);

    table.foreign('dataset_id').references('id').inTable('datasets').onDelete('CASCADE');
    table.index(['dataset_id', 'status']);
    table.index('created_at');
  });

  // Create scheduled_jobs table
  await knex.schema.createTable('scheduled_jobs', (table) => {
    table.increments('id');
    table.string('job_type').notNullable(); // 'report', 'metric', 'etl', 'aggregation'
    table.string('job_id').notNullable();
    table.string('schedule').notNullable(); // Cron expression
    table.boolean('enabled').defaultTo(true);
    table.timestamp('next_run_at');
    table.timestamp('last_run_at');
    table.enum('last_run_status', ['success', 'failed']);
    table.jsonb('config');
    table.string('created_by').notNullable();
    table.timestamps(true, true);

    table.index(['job_type', 'job_id']);
    table.index('next_run_at');
    table.index('enabled');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('scheduled_jobs');
  await knex.schema.dropTableIfExists('etl_jobs');
  await knex.schema.dropTableIfExists('data_sources');
  await knex.schema.dropTableIfExists('dataset_data');
  await knex.schema.dropTableIfExists('dataset_versions');
  await knex.schema.dropTableIfExists('datasets');
  await knex.schema.dropTableIfExists('query_executions');
  await knex.schema.dropTableIfExists('queries');
}