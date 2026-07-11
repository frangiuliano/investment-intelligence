import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { NewsArticle } from '../news/entities/news-article.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { InitialSchema1752180000000 } from './migrations/1752180000000-InitialSchema';

loadEnv();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is required to run TypeORM CLI commands (migrations)',
  );
}

export default new DataSource({
  type: 'postgres',
  url: databaseUrl,
  entities: [NewsArticle, NewsAnalysis, Notification],
  migrations: [InitialSchema1752180000000],
  synchronize: false,
  logging: false,
});
