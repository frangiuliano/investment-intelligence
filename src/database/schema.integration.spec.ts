import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { NewsArticle } from '../news/entities/news-article.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { InitialSchema1752180000000 } from './migrations/1752180000000-InitialSchema';

const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/investment_intelligence';

describe('Database schema (integration)', () => {
  let dataSource: DataSource;
  let articles: Repository<NewsArticle>;
  let analyses: Repository<NewsAnalysis>;
  let notifications: Repository<Notification>;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      entities: [NewsArticle, NewsAnalysis, Notification],
      migrations: [InitialSchema1752180000000],
      synchronize: false,
      logging: false,
    });

    await dataSource.initialize();
    await dataSource.query('DROP SCHEMA IF EXISTS public CASCADE');
    await dataSource.query('CREATE SCHEMA public');
    await dataSource.runMigrations();

    articles = dataSource.getRepository(NewsArticle);
    analyses = dataSource.getRepository(NewsAnalysis);
    notifications = dataSource.getRepository(Notification);
  }, 30_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE TABLE "notifications", "news_analysis", "news_articles" RESTART IDENTITY CASCADE',
    );
  });

  it('should create the three domain tables after migrations', async () => {
    const rows: Array<{ table_name: string }> = await dataSource.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('news_articles', 'news_analysis', 'notifications')
      ORDER BY table_name
    `);

    expect(rows.map((row) => row.table_name)).toEqual([
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
    expect(notification.articleId).toBe(article.id);

    await expect(
      analyses.save(
        analyses.create({
          articleId: '00000000-0000-4000-8000-000000000099',
          summary: 'orphan',
          sentiment: 'neutral',
          tickers: [],
          model: 'gemini-flash',
        }),
      ),
    ).rejects.toBeInstanceOf(QueryFailedError);

    await articles.delete(article.id);

    expect(await analyses.findOneBy({ id: analysis.id })).toBeNull();
    expect(await notifications.findOneBy({ id: notification.id })).toBeNull();
  });
});
