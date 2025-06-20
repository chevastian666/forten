import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('visitors', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Personal information
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('email', 255).notNullable();
    table.string('phone', 50).notNullable();
    table.string('company', 255);
    table.string('document_type', 50);
    table.string('document_number', 100);
    table.text('photo');
    
    // Contact info
    table.jsonb('contact_info').notNullable();
    table.jsonb('emergency_contact');
    
    // Visit details
    table.enum('visitor_type', [
      'GUEST', 'CONTRACTOR', 'DELIVERY', 'INTERVIEW', 
      'VENDOR', 'MAINTENANCE', 'GOVERNMENT', 'OTHER'
    ]).notNullable();
    table.enum('status', [
      'SCHEDULED', 'PRE_REGISTERED', 'CHECKED_IN', 
      'CHECKED_OUT', 'CANCELLED', 'NO_SHOW'
    ]).notNullable().defaultTo('SCHEDULED');
    
    // Host information
    table.string('host_user_id', 255).notNullable();
    table.string('host_name', 255).notNullable();
    table.string('host_department', 255);
    table.text('purpose').notNullable();
    
    // Timing
    table.timestamp('expected_arrival').notNullable();
    table.timestamp('expected_departure').notNullable();
    table.timestamp('actual_arrival');
    table.timestamp('actual_departure');
    
    // Location and access
    table.uuid('building_id').notNullable().references('id').inTable('buildings').onDelete('CASCADE');
    table.jsonb('allowed_areas').defaultTo('[]');
    table.uuid('temporary_access_id');
    table.string('badge_number', 50);
    
    // Vehicle and additional info
    table.jsonb('vehicle_info');
    table.text('special_instructions');
    table.jsonb('agreements_accepted').defaultTo('{}');
    
    // Metadata
    table.jsonb('metadata');
    
    // Timestamps
    table.timestamps(true, true);
    
    // Indexes
    table.index('email');
    table.index('phone');
    table.index('status');
    table.index('visitor_type');
    table.index('host_user_id');
    table.index('building_id');
    table.index('expected_arrival');
    table.index('badge_number');
    table.index(['document_type', 'document_number']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('visitors');
}