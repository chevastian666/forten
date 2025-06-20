import type { Knex } from 'knex';
import { config } from './src/infrastructure/config/config';

const knexConfig: { [key: string]: Knex.Config } = {
  development: {
    client: 'postgresql',
    connection: config.database.url,
    pool: {
      min: config.database.pool.min,
      max: config.database.pool.max
    },
    migrations: {
      directory: './src/infrastructure/database/migrations',
      extension: 'ts'
    },
    seeds: {
      directory: './src/infrastructure/database/seeds'
    }
  },

  test: {
    client: 'postgresql',
    connection: process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/forten_analytics_test',
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './src/infrastructure/database/migrations',
      extension: 'ts'
    },
    seeds: {
      directory: './src/infrastructure/database/seeds'
    }
  },

  production: {
    client: 'postgresql',
    connection: config.database.url,
    pool: {
      min: config.database.pool.min,
      max: config.database.pool.max
    },
    migrations: {
      directory: './src/infrastructure/database/migrations',
      extension: 'ts'
    }
  }
};

export default knexConfig;