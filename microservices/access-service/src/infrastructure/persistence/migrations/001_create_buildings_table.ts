import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('buildings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.string('code', 50).notNullable().unique();
    table.text('description');
    
    // Address
    table.jsonb('address').notNullable();
    table.string('timezone', 50).notNullable();
    
    // Status and details
    table.enum('status', ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'EMERGENCY']).notNullable().defaultTo('ACTIVE');
    table.integer('floors').notNullable();
    table.decimal('total_area', 10, 2);
    table.enum('security_level', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).notNullable().defaultTo('MEDIUM');
    
    // Access control system
    table.jsonb('access_control_system').notNullable();
    
    // Operating hours and special dates
    table.jsonb('operating_hours').notNullable();
    table.jsonb('special_dates').defaultTo('[]');
    
    // Emergency contacts
    table.jsonb('emergency_contacts').defaultTo('[]');
    
    // Facilities and features
    table.jsonb('facilities').defaultTo('[]');
    table.jsonb('features').defaultTo('[]');
    
    // Parking and occupancy
    table.integer('parking_spaces');
    table.integer('visitor_parking_spaces');
    table.integer('max_occupancy');
    table.integer('current_occupancy').defaultTo(0);
    
    // Metadata
    table.jsonb('metadata');
    
    // Timestamps
    table.timestamps(true, true);
    
    // Indexes
    table.index('code');
    table.index('status');
    table.index('security_level');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('buildings');
}