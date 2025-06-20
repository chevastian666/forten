import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create metrics table
  await knex.schema.createTable('metrics', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.enum('type', [
      'COUNTER',
      'GAUGE',
      'HISTOGRAM',
      'SUMMARY',
      'PERCENTAGE',
      'CURRENCY',
      'DURATION'
    ]).notNullable();
    table.enum('category', [
      'SALES',
      'INVENTORY',
      'FINANCE',
      'CUSTOMER',
      'OPERATIONS',
      'PERFORMANCE',
      'CUSTOM'
    ]).notNullable();
    table.string('unit').notNullable();
    table.jsonb('calculation').notNullable();
    table.decimal('current_value', 20, 4).defaultTo(0);
    table.decimal('previous_value', 20, 4);
    table.jsonb('thresholds');
    table.specificType('tags', 'text[]');
    table.boolean('is_kpi').defaultTo(false);
    table.timestamp('last_updated').defaultTo(knex.fn.now());
    table.timestamps(true, true);

    // Indexes
    table.index('category');
    table.index('is_kpi');
    table.index('tags', 'GIN');
    table.index('last_updated');
  });

  // Create metric_values table with TimescaleDB hypertable
  await knex.schema.createTable('metric_values', (table) => {
    table.string('metric_id').notNullable();
    table.decimal('value', 20, 4).notNullable();
    table.timestamp('timestamp', { useTz: true }).notNullable();
    table.jsonb('dimensions');
    table.jsonb('metadata');

    table.foreign('metric_id').references('id').inTable('metrics').onDelete('CASCADE');
    table.index(['metric_id', 'timestamp']);
    table.index('timestamp');
  });

  // Convert to TimescaleDB hypertable
  await knex.raw(`
    SELECT create_hypertable('metric_values', 'timestamp', 
      chunk_time_interval => INTERVAL '1 day',
      if_not_exists => TRUE
    );
  `);

  // Create continuous aggregate for hourly metrics
  await knex.raw(`
    CREATE MATERIALIZED VIEW metric_values_hourly
    WITH (timescaledb.continuous) AS
    SELECT 
      metric_id,
      time_bucket('1 hour', timestamp) AS hour,
      AVG(value) as avg_value,
      MIN(value) as min_value,
      MAX(value) as max_value,
      COUNT(*) as count
    FROM metric_values
    GROUP BY metric_id, hour
    WITH NO DATA;
  `);

  // Create policy to refresh the continuous aggregate
  await knex.raw(`
    SELECT add_continuous_aggregate_policy('metric_values_hourly',
      start_offset => INTERVAL '3 hours',
      end_offset => INTERVAL '1 hour',
      schedule_interval => INTERVAL '1 hour'
    );
  `);

  // Create metric_alerts table
  await knex.schema.createTable('metric_alerts', (table) => {
    table.increments('id');
    table.string('metric_id').notNullable();
    table.enum('severity', ['warning', 'critical']).notNullable();
    table.decimal('threshold_value', 20, 4).notNullable();
    table.string('operator').notNullable();
    table.timestamp('triggered_at').notNullable();
    table.decimal('actual_value', 20, 4).notNullable();
    table.timestamp('resolved_at');
    table.jsonb('notification_sent_to');

    table.foreign('metric_id').references('id').inTable('metrics').onDelete('CASCADE');
    table.index(['metric_id', 'triggered_at']);
    table.index('severity');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop continuous aggregate policy
  await knex.raw(`
    SELECT remove_continuous_aggregate_policy('metric_values_hourly', if_exists => true);
  `).catch(() => {});

  // Drop continuous aggregate
  await knex.raw(`
    DROP MATERIALIZED VIEW IF EXISTS metric_values_hourly;
  `);

  await knex.schema.dropTableIfExists('metric_alerts');
  await knex.schema.dropTableIfExists('metric_values');
  await knex.schema.dropTableIfExists('metrics');
}