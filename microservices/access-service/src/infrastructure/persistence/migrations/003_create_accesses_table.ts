import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('accesses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('user_id', 255).notNullable(); // Can be user ID or visitor ID
    table.uuid('building_id').notNullable().references('id').inTable('buildings').onDelete('CASCADE');
    table.jsonb('door_ids').notNullable();
    
    // PIN information
    table.string('pin_value', 8);
    table.timestamp('pin_expires_at');
    
    // Access type and status
    table.enum('access_type', [
      'PERMANENT', 'TEMPORARY', 'VISITOR', 'CONTRACTOR', 'EMERGENCY', 'MAINTENANCE'
    ]).notNullable();
    table.enum('status', [
      'ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED', 'PENDING'
    ]).notNullable().defaultTo('ACTIVE');
    
    // Permissions and validity
    table.jsonb('permissions').defaultTo('[]');
    table.timestamp('valid_from').notNullable();
    table.timestamp('valid_until');
    table.boolean('is_temporary').notNullable().defaultTo(false);
    
    // Usage tracking
    table.integer('max_usage_count');
    table.integer('current_usage_count').notNullable().defaultTo(0);
    
    // Metadata and audit
    table.jsonb('metadata');
    table.string('created_by', 255).notNullable();
    
    // Timestamps
    table.timestamps(true, true);
    
    // Indexes
    table.index('user_id');
    table.index('building_id');
    table.index(['pin_value', 'building_id']);
    table.index('status');
    table.index('access_type');
    table.index('valid_from');
    table.index('valid_until');
    table.index('created_by');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('accesses');
}