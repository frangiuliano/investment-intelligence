import { Logger } from '@nestjs/common';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { NewsArticle } from '../news/entities/news-article.entity';
import { NewsStoryClusterMember } from '../notifications/entities/news-story-cluster-member.entity';
import { NewsStoryCluster } from '../notifications/entities/news-story-cluster.entity';
import { Notification } from '../notifications/entities/notification.entity';
import {
  Holding,
  HoldingAssetType,
} from '../portfolio/holdings/entities/holding.entity';
import { WatchlistEntry } from '../portfolio/watchlist/entities/watchlist-entry.entity';
import { InitialSchema1752180000000 } from './migrations/1752180000000-InitialSchema';
import { AddNewsAnalysisMateriality1752430000000 } from './migrations/1752430000000-AddNewsAnalysisMateriality';
import { CreateHoldings1752500000000 } from './migrations/1752500000000-CreateHoldings';
import { CreateWatchlistEntries1752510000000 } from './migrations/1752510000000-CreateWatchlistEntries';
import { AddNewsAnalysisEventType1752520000000 } from './migrations/1752520000000-AddNewsAnalysisEventType';
import { CreateNewsStoryClusters1752530000000 } from './migrations/1752530000000-CreateNewsStoryClusters';
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
  let watchlistEntries: Repository<WatchlistEntry>;
  let storyClusters: Repository<NewsStoryCluster>;
  let storyClusterMembers: Repository<NewsStoryClusterMember>;
  let databaseUrl: string;

  beforeAll(async () => {
    databaseUrl = resolveTestDatabaseUrl(process.env.TEST_DATABASE_URL);

    dataSource = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      entities: [
        NewsArticle,
        NewsAnalysis,
        Notification,
        Holding,
        WatchlistEntry,
        NewsStoryCluster,
        NewsStoryClusterMember,
      ],
      migrations: [
        InitialSchema1752180000000,
        AddNewsAnalysisMateriality1752430000000,
        CreateHoldings1752500000000,
        CreateWatchlistEntries1752510000000,
        AddNewsAnalysisEventType1752520000000,
        CreateNewsStoryClusters1752530000000,
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
    watchlistEntries = dataSource.getRepository(WatchlistEntry);
    storyClusters = dataSource.getRepository(NewsStoryCluster);
    storyClusterMembers = dataSource.getRepository(NewsStoryClusterMember);
  }, 30_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE TABLE "notifications", "news_story_cluster_members", "news_story_clusters", "news_analysis", "news_articles", "holdings", "watchlist_entries" RESTART IDENTITY CASCADE',
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
          'holdings',
          'watchlist_entries',
          'news_story_clusters',
          'news_story_cluster_members'
        )
      ORDER BY table_name
    `);

    expect(rows.map((row) => row.table_name)).toEqual([
      'holdings',
      'news_analysis',
      'news_articles',
      'news_story_cluster_members',
      'news_story_clusters',
      'notifications',
      'watchlist_entries',
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
        eventType: 'earnings',
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
    expect(analysis.eventType).toBe('earnings');
    expect(notification.articleId).toBe(article.id);

    await expect(
      analyses.save(
        analyses.create({
          articleId: '00000000-0000-4000-8000-000000000099',
          summary: 'orphan',
          sentiment: 'neutral',
          tickers: [],
          materiality: 'low',
          eventType: 'none',
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

  it('should persist watchlist entries and enforce active uniqueness plus soft-delete', async () => {
    const entry = await watchlistEntries.save(
      watchlistEntries.create({
        symbol: 'AAPL',
        notes: 'earnings season',
      }),
    );

    expect(entry.id).toBeDefined();
    expect(entry.symbol).toBe('AAPL');

    await expect(
      watchlistEntries.save(
        watchlistEntries.create({
          symbol: 'AAPL',
          notes: null,
        }),
      ),
    ).rejects.toBeInstanceOf(QueryFailedError);

    await watchlistEntries.softRemove(entry);

    const afterSoftDelete = await watchlistEntries.findOne({
      where: { id: entry.id },
      withDeleted: true,
    });
    expect(afterSoftDelete?.deletedAt).not.toBeNull();
    expect(await watchlistEntries.findOneBy({ id: entry.id })).toBeNull();

    const recreated = await watchlistEntries.save(
      watchlistEntries.create({
        symbol: 'AAPL',
        notes: null,
      }),
    );
    expect(recreated.id).not.toBe(entry.id);
  });

  it('should persist story cluster membership with unique article_id', async () => {
    const article = await articles.save(
      articles.create({
        title: 'Cluster story',
        url: 'https://example.com/cluster',
        content: 'body',
        source: 'example',
        contentHash: 'hash-cluster',
        publishedAt: null,
      }),
    );

    const cluster = await storyClusters.save(storyClusters.create());
    await storyClusterMembers.save(
      storyClusterMembers.create({
        clusterId: cluster.id,
        articleId: article.id,
        alerted: true,
      }),
    );

    await expect(
      storyClusterMembers.save(
        storyClusterMembers.create({
          clusterId: cluster.id,
          articleId: article.id,
          alerted: false,
        }),
      ),
    ).rejects.toBeInstanceOf(QueryFailedError);
  });
});
