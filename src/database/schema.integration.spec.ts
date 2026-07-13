import { Logger } from '@nestjs/common';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { NewsArticle } from '../news/entities/news-article.entity';
import { Notification } from '../notifications/entities/notification.entity';
import {
  Holding,
  HoldingAssetType,
} from '../portfolio/holdings/entities/holding.entity';
import { InitialSchema1752180000000 } from './migrations/1752180000000-InitialSchema';
import { AddNewsAnalysisMateriality1752430000000 } from './migrations/1752430000000-AddNewsAnalysisMateriality';
import { CreateHoldings1752500000000 } from './migrations/1752500000000-CreateHoldings';
import {
  DEFAULT_TEST_DATABASE_URL,
  resolveTestDatabaseUrl,
} from './test-database-url';

const logger = new Logger('SchemaIntegrationSpec');

describe('Database schema (integration)', () => {
  let dataSource: DataSource;
  let articles: Repository<NewsArticle>;
  let analyses: Repository<NewsAnalysis>;
  let notifications: Repository<Notification>;
  let holdings: Repository<Holding>;
  let databaseUrl: string;

  beforeAll(async () => {
    databaseUrl = resolveTestDatabaseUrl(process.env.TEST_DATABASE_URL);

    dataSource = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      entities: [NewsArticle, NewsAnalysis, Notification, Holding],
      migrations: [
        InitialSchema1752180000000,
        AddNewsAnalysisMateriality1752430000000,
        CreateHoldings1752500000000,
      ],
      synchronize: false,
      logging: false,
    });

    try {
      await dataSource.initialize();
    } catch (error) {
      logger.error(
        `Cannot connect to TEST_DATABASE_URL. Create the test DB first, e.g.:\n` +
          `  docker compose exec postgres psql -U postgres -c "CREATE DATABASE investment_intelligence_test;"\n` +
          `Default URL: ${DEFAULT_TEST_DATABASE_URL}`,
      );
      throw error;
    }

    await dataSource.query('DROP SCHEMA IF EXISTS public CASCADE');
    await dataSource.query('CREATE SCHEMA public');
    await dataSource.runMigrations();

    articles = dataSource.getRepository(NewsArticle);
    analyses = dataSource.getRepository(NewsAnalysis);
    notifications = dataSource.getRepository(Notification);
    holdings = dataSource.getRepository(Holding);
  }, 30_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE TABLE "notifications", "news_analysis", "news_articles", "holdings" RESTART IDENTITY CASCADE',
    );
  });

  it('should create the domain tables after migrations', async () => {
    const rows: Array<{ table_name: string }> = await dataSource.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'news_articles',
          'news_analysis',
          'notifications',
          'holdings'
        )
      ORDER BY table_name
    `);

    expect(rows.map((row) => row.table_name)).toEqual([
      'holdings',
      'news_analysis',
      'news_articles',
      'notifications',
    ]);
  });

  it('should enforce unique constraints on news_articles.url and content_hash', async () => {
    await articles.save(
      articles.create({
        title: 'First',
        url: 'https://example.com/a',
        content: 'body',
        source: 'example',
        contentHash: 'hash-a',
        publishedAt: null,
      }),
    );

    await expect(
      articles.save(
        articles.create({
          title: 'Duplicate URL',
          url: 'https://example.com/a',
          content: 'other',
          source: 'example',
          contentHash: 'hash-b',
          publishedAt: null,
        }),
      ),
    ).rejects.toBeInstanceOf(QueryFailedError);

    await expect(
      articles.save(
        articles.create({
          title: 'Duplicate hash',
          url: 'https://example.com/b',
          content: 'other',
          source: 'example',
          contentHash: 'hash-a',
          publishedAt: null,
        }),
      ),
    ).rejects.toBeInstanceOf(QueryFailedError);
  });

  it('should enforce foreign keys with referential integrity', async () => {
    const article = await articles.save(
      articles.create({
        title: 'Analyzed',
        url: 'https://example.com/c',
        content: 'body',
        source: 'example',
        contentHash: 'hash-c',
        publishedAt: null,
      }),
    );

    const analysis = await analyses.save(
      analyses.create({
        articleId: article.id,
        summary: 'Short summary',
        sentiment: 'positive',
        tickers: ['AAPL'],
        materiality: 'high',
        model: 'gemini-flash',
      }),
    );

    const notification = await notifications.save(
      notifications.create({
        articleId: article.id,
        channel: 'telegram',
        payload: { messageId: 1 },
      }),
    );

    expect(analysis.articleId).toBe(article.id);
    expect(analysis.materiality).toBe('high');
    expect(notification.articleId).toBe(article.id);

    await expect(
      analyses.save(
        analyses.create({
          articleId: '00000000-0000-4000-8000-000000000099',
          summary: 'orphan',
          sentiment: 'neutral',
          tickers: [],
          materiality: 'low',
          model: 'gemini-flash',
        }),
      ),
    ).rejects.toBeInstanceOf(QueryFailedError);

    await articles.delete(article.id);

    expect(await analyses.findOneBy({ id: analysis.id })).toBeNull();
    expect(await notifications.findOneBy({ id: notification.id })).toBeNull();
  });

  it('should persist holdings and enforce active uniqueness plus soft-delete', async () => {
    const holding = await holdings.save(
      holdings.create({
        symbol: 'AAPL',
        assetType: HoldingAssetType.EQUITY,
        quantity: '10',
        currency: 'USD',
        avgEntryPrice: '150',
        notes: 'core position',
      }),
    );

    expect(holding.id).toBeDefined();
    expect(holding.symbol).toBe('AAPL');

    await expect(
      holdings.save(
        holdings.create({
          symbol: 'AAPL',
          assetType: HoldingAssetType.EQUITY,
          quantity: '1',
          currency: 'USD',
          avgEntryPrice: null,
          notes: null,
        }),
      ),
    ).rejects.toBeInstanceOf(QueryFailedError);

    await holdings.softRemove(holding);

    const afterSoftDelete = await holdings.findOne({
      where: { id: holding.id },
      withDeleted: true,
    });
    expect(afterSoftDelete?.deletedAt).not.toBeNull();
    expect(await holdings.findOneBy({ id: holding.id })).toBeNull();

    const recreated = await holdings.save(
      holdings.create({
        symbol: 'AAPL',
        assetType: HoldingAssetType.EQUITY,
        quantity: '5',
        currency: 'USD',
        avgEntryPrice: null,
        notes: null,
      }),
    );
    expect(recreated.id).not.toBe(holding.id);
  });
});
