import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_roles', (table) => {
    table.uuid('user_id').notNullable();
    table.uuid('role_id').notNullable();
    table.timestamps(true, true);

    // Primary key
    table.primary(['user_id', 'role_id']);

    // Foreign keys
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('role_id').references('id').inTable('roles').onDelete('CASCADE');

    // Indexes
    table.index(['user_id']);
    table.index(['role_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_roles');
}