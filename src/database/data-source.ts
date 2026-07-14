import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { NewsArticle } from '../news/entities/news-article.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Holding } from '../portfolio/holdings/entities/holding.entity';
import { WatchlistEntry } from '../portfolio/watchlist/entities/watchlist-entry.entity';
import { InitialSchema1752180000000 } from './migrations/1752180000000-InitialSchema';
import { AddNewsAnalysisMateriality1752430000000 } from './migrations/1752430000000-AddNewsAnalysisMateriality';
import { CreateHoldings1752500000000 } from './migrations/1752500000000-CreateHoldings';
import { CreateWatchlistEntries1752510000000 } from './migrations/1752510000000-CreateWatchlistEntries';

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
  entities: [NewsArticle, NewsAnalysis, Notification, Holding, WatchlistEntry],
  migrations: [
    InitialSchema1752180000000,
    AddNewsAnalysisMateriality1752430000000,
    CreateHoldings1752500000000,
    CreateWatchlistEntries1752510000000,
  ],
  synchronize: false,
  logging: false,
});
