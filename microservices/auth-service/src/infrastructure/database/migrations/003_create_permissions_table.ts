import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('permissions', (table) => {
    table.uuid('id').primary();
    table.string('name').notNullable().unique();
    table.text('description').notNullable();
    table.string('resource').notNullable();
    table.string('action').notNullable();
    table.timestamps(true, true);

    // Indexes
    table.index(['name']);
    table.index(['resource']);
    table.index(['action']);
    table.index(['resource', 'action']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('permissions');
}