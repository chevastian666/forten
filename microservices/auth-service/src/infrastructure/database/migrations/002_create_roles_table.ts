import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('roles', (table) => {
    table.uuid('id').primary();
    table.string('name').notNullable().unique();
    table.text('description').notNullable();
    table.boolean('is_system').defaultTo(false);
    table.timestamps(true, true);

    // Indexes
    table.index(['name']);
    table.index(['is_system']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('roles');
}