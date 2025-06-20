import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('access_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Related entities
    table.uuid('access_id');
    table.string('user_id', 255);
    table.uuid('visitor_id');
    table.uuid('building_id').notNullable().references('id').inTable('buildings').onDelete('CASCADE');
    table.uuid('door_id').notNullable().references('id').inTable('doors').onDelete('CASCADE');
    
    // Access details
    table.enum('access_method', [
      'PIN', 'CARD', 'BIOMETRIC', 'MOBILE', 'FACIAL', 'EMERGENCY', 'MANUAL'
    ]).notNullable();
    table.enum('access_result', [
      'SUCCESS', 'DENIED', 'EXPIRED', 'INVALID_PIN', 'INVALID_CARD', 
      'INVALID_BIOMETRIC', 'OUTSIDE_SCHEDULE', 'DOOR_OFFLINE', 
      'ANTI_PASSBACK', 'MAX_USAGE_REACHED', 'EMERGENCY', 'UNKNOWN_ERROR'
    ]).notNullable();
    table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
    
    // Credential information
    table.string('pin', 8);
    table.string('card_number', 50);
    table.text('biometric_data');
    table.text('failure_reason');
    
    // Additional context
    table.string('ip_address', 45);
    table.jsonb('device_info');
    table.jsonb('location');
    table.jsonb('metadata');
    
    // Indexes for performance
    table.index('access_id');
    table.index('user_id');
    table.index('visitor_id');
    table.index('building_id');
    table.index('door_id');
    table.index('access_method');
    table.index('access_result');
    table.index('timestamp');
    table.index(['building_id', 'timestamp']);
    table.index(['door_id', 'timestamp']);
    table.index(['user_id', 'timestamp']);
    table.index(['visitor_id', 'timestamp']);
  });

  // Create a hypertable for time-series data if using TimescaleDB
  await knex.raw(`
    DO $$ 
    BEGIN 
      IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
        PERFORM create_hypertable('access_logs', 'timestamp', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);
      END IF;
    END $$;
  `).catch(() => {
    // Ignore error if TimescaleDB is not installed
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('access_logs');
}