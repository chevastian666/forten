import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('doors', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.string('code', 50).notNullable();
    table.text('description');
    
    // Location
    table.uuid('building_id').notNullable().references('id').inTable('buildings').onDelete('CASCADE');
    table.integer('floor').notNullable();
    table.string('area', 100).notNullable();
    
    // Type and hardware
    table.enum('door_type', [
      'MAIN_ENTRANCE', 'SIDE_ENTRANCE', 'EMERGENCY_EXIT', 
      'INTERNAL', 'ELEVATOR', 'PARKING', 'RESTRICTED'
    ]).notNullable();
    table.enum('lock_type', [
      'ELECTRONIC', 'MAGNETIC', 'MECHANICAL', 'BIOMETRIC', 'HYBRID'
    ]).notNullable();
    table.enum('status', [
      'LOCKED', 'UNLOCKED', 'OFFLINE', 'MAINTENANCE', 'EMERGENCY'
    ]).notNullable().defaultTo('LOCKED');
    
    // Hardware and connection info
    table.jsonb('hardware_info').notNullable();
    table.jsonb('connection_info').notNullable();
    
    // Security and access
    table.enum('security_level', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).notNullable().defaultTo('MEDIUM');
    table.jsonb('access_methods').defaultTo('["PIN"]');
    
    // Schedules and alarms
    table.jsonb('schedules').defaultTo('[]');
    table.jsonb('alarms').notNullable();
    table.jsonb('emergency_settings').notNullable();
    
    // Features and metadata
    table.jsonb('features').defaultTo('[]');
    table.jsonb('metadata');
    
    // Timestamps
    table.timestamps(true, true);
    
    // Indexes
    table.unique(['code', 'building_id']);
    table.index('building_id');
    table.index('status');
    table.index('door_type');
    table.index('floor');
    table.index('security_level');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('doors');
}