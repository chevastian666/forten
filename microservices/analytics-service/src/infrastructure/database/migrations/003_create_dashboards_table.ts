import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create dashboards table
  await knex.schema.createTable('dashboards', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.jsonb('widgets').defaultTo('[]');
    table.string('category').notNullable();
    table.specificType('tags', 'text[]').defaultTo('{}');
    table.boolean('is_public').defaultTo(false);
    table.string('created_by').notNullable();
    table.jsonb('permissions').defaultTo('[]');
    table.integer('refresh_interval').defaultTo(0);
    table.jsonb('theme');
    table.jsonb('filters');
    table.timestamps(true, true);

    // Indexes
    table.index('category');
    table.index('created_by');
    table.index('is_public');
    table.index('tags', 'GIN');
  });

  // Create dashboard_shares table
  await knex.schema.createTable('dashboard_shares', (table) => {
    table.increments('id');
    table.string('dashboard_id').notNullable();
    table.string('user_id');
    table.string('role');
    table.string('department');
    table.boolean('can_view').defaultTo(true);
    table.boolean('can_edit').defaultTo(false);
    table.boolean('can_delete').defaultTo(false);
    table.boolean('can_share').defaultTo(false);
    table.timestamp('shared_at').defaultTo(knex.fn.now());
    table.string('shared_by').notNullable();

    table.foreign('dashboard_id').references('id').inTable('dashboards').onDelete('CASCADE');
    table.index(['dashboard_id', 'user_id']);
    table.index(['dashboard_id', 'role']);
  });

  // Create dashboard_widgets table for better widget management
  await knex.schema.createTable('dashboard_widgets', (table) => {
    table.string('id').primary();
    table.string('dashboard_id').notNullable();
    table.enum('type', [
      'CHART',
      'TABLE',
      'METRIC_CARD',
      'MAP',
      'TIMELINE',
      'HEATMAP',
      'GAUGE',
      'TEXT'
    ]).notNullable();
    table.string('title').notNullable();
    table.text('description');
    table.jsonb('config').notNullable();
    table.jsonb('layout').notNullable();
    table.integer('refresh_interval');
    table.jsonb('custom_styles');
    table.integer('order_index').defaultTo(0);
    table.timestamps(true, true);

    table.foreign('dashboard_id').references('id').inTable('dashboards').onDelete('CASCADE');
    table.index(['dashboard_id', 'order_index']);
  });

  // Create widget_cache table
  await knex.schema.createTable('widget_cache', (table) => {
    table.string('widget_id').notNullable();
    table.string('cache_key').notNullable();
    table.jsonb('data');
    table.timestamp('cached_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable();

    table.primary(['widget_id', 'cache_key']);
    table.foreign('widget_id').references('id').inTable('dashboard_widgets').onDelete('CASCADE');
    table.index('expires_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('widget_cache');
  await knex.schema.dropTableIfExists('dashboard_widgets');
  await knex.schema.dropTableIfExists('dashboard_shares');
  await knex.schema.dropTableIfExists('dashboards');
}