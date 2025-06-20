import { DataSource } from 'typeorm';
import { NotificationEntity } from './entities/NotificationEntity';
import { TemplateEntity } from './entities/TemplateEntity';
import { ContactEntity } from './entities/ContactEntity';
import { CampaignEntity } from './entities/CampaignEntity';
import dotenv from 'dotenv';

dotenv.config();

export const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'communication_db',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: [
    NotificationEntity,
    TemplateEntity,
    ContactEntity,
    CampaignEntity
  ],
  migrations: [
    __dirname + '/../../migrations/*.ts'
  ],
  subscribers: [],
  ssl: process.env.DATABASE_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false
});