import { Logger } from '@nestjs/common';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { ResearchBrief } from '../brief/entities/research-brief.entity';
import {
  FeedbackLabel,
  FeedbackTargetType,
  OperatorFeedback,
} from '../feedback/entities/operator-feedback.entity';
import { NewsArticle } from '../news/entities/news-article.entity';
import { DigestItem } from '../notifications/entities/digest-item.entity';
import { DigestRun } from '../notifications/entities/digest-run.entity';
import { NewsStoryClusterMember } from '../notifications/entities/news-story-cluster-member.entity';
import { NewsStoryCluster } from '../notifications/entities/news-story-cluster.entity';
import { Notification } from '../notifications/entities/notification.entity';
import {
  Holding,
  HoldingAssetType,
} from '../portfolio/holdings/entities/holding.entity';
import { WatchlistEntry } from '../portfolio/watchlist/entities/watchlist-entry.entity';
import {
  Hypothesis,
  HypothesisBias,
  HypothesisSource,
  HypothesisStatus,
} from '../research/hypotheses/entities/hypothesis.entity';
import { HypothesisReviewRun } from '../research/reviews/entities/hypothesis-review-run.entity';
import {
  HypothesisReview,
  HypothesisReviewOutcome,
} from '../research/reviews/entities/hypothesis-review.entity';
import { InitialSchema1752180000000 } from './migrations/1752180000000-InitialSchema';
import { AddNewsAnalysisMateriality1752430000000 } from './migrations/1752430000000-AddNewsAnalysisMateriality';
import { CreateHoldings1752500000000 } from './migrations/1752500000000-CreateHoldings';
import { CreateWatchlistEntries1752510000000 } from './migrations/1752510000000-CreateWatchlistEntries';
import { AddNewsAnalysisEventType1752520000000 } from './migrations/1752520000000-AddNewsAnalysisEventType';
import { CreateNewsStoryClusters1752530000000 } from './migrations/1752530000000-CreateNewsStoryClusters';
import { CreateDigestTables1752540000000 } from './migrations/1752540000000-CreateDigestTables';
import { AddNewsAnalysisHeadline1752550000000 } from './migrations/1752550000000-AddNewsAnalysisHeadline';
import { CreateResearchBriefs1752560000000 } from './migrations/1752560000000-CreateResearchBriefs';
import { CreateHypotheses1752570000000 } from './migrations/1752570000000-CreateHypotheses';
import { CreateHypothesisReviews1752580000000 } from './migrations/1752580000000-CreateHypothesisReviews';
import { AddResearchBriefStance1752590000000 } from './migrations/1752590000000-AddResearchBriefStance';
import { AddResearchBriefChartPng1752600000000 } from './migrations/1752600000000-AddResearchBriefChartPng';
import { AddKnowledgeVersionColumns1752610000000 } from './migrations/1752610000000-AddKnowledgeVersionColumns';
import { CreateOperatorFeedback1752620000000 } from './migrations/1752620000000-CreateOperatorFeedback';
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
  let digestRuns: Repository<DigestRun>;
  let digestItems: Repository<DigestItem>;
  let researchBriefs: Repository<ResearchBrief>;
  let hypotheses: Repository<Hypothesis>;
  let hypothesisReviewRuns: Repository<HypothesisReviewRun>;
  let hypothesisReviews: Repository<HypothesisReview>;
  let operatorFeedback: Repository<OperatorFeedback>;
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
        DigestRun,
        DigestItem,
        ResearchBrief,
        Hypothesis,
        HypothesisReviewRun,
        HypothesisReview,
        OperatorFeedback,
      ],
      migrations: [
        InitialSchema1752180000000,
        AddNewsAnalysisMateriality1752430000000,
        CreateHoldings1752500000000,
        CreateWatchlistEntries1752510000000,
        AddNewsAnalysisEventType1752520000000,
        CreateNewsStoryClusters1752530000000,
        CreateDigestTables1752540000000,
        AddNewsAnalysisHeadline1752550000000,
        CreateResearchBriefs1752560000000,
        CreateHypotheses1752570000000,
        CreateHypothesisReviews1752580000000,
        AddResearchBriefStance1752590000000,
        AddResearchBriefChartPng1752600000000,
        AddKnowledgeVersionColumns1752610000000,
        CreateOperatorFeedback1752620000000,
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
    digestRuns = dataSource.getRepository(DigestRun);
    digestItems = dataSource.getRepository(DigestItem);
    researchBriefs = dataSource.getRepository(ResearchBrief);
    hypotheses = dataSource.getRepository(Hypothesis);
    hypothesisReviewRuns = dataSource.getRepository(HypothesisReviewRun);
    hypothesisReviews = dataSource.getRepository(HypothesisReview);
    operatorFeedback = dataSource.getRepository(OperatorFeedback);
  }, 30_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE TABLE "operator_feedback", "hypothesis_reviews", "hypothesis_review_runs", "hypotheses", "research_briefs", "digest_items", "digest_runs", "notifications", "news_story_cluster_members", "news_story_clusters", "news_analysis", "news_articles", "holdings", "watchlist_entries" RESTART IDENTITY CASCADE',
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
          'news_story_cluster_members',
          'digest_runs',
          'digest_items',
          'research_briefs',
          'hypotheses',
          'hypothesis_review_runs',
          'hypothesis_reviews',
          'operator_feedback'
        )
      ORDER BY table_name
    `);

    expect(rows.map((row) => row.table_name)).toEqual([
      'digest_items',
      'digest_runs',
      'holdings',
      'hypotheses',
      'hypothesis_review_runs',
      'hypothesis_reviews',
      'news_analysis',
      'news_articles',
      'news_story_cluster_members',
      'news_story_clusters',
      'notifications',
      'operator_feedback',
      'research_briefs',
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
    expect(analysis.headline).toBe('');
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

  it('should persist digest runs/items and enforce unique article_id', async () => {
    const article = await articles.save(
      articles.create({
        title: 'Digest story',
        url: 'https://example.com/digest',
        content: 'body',
        source: 'example',
        contentHash: 'hash-digest',
        publishedAt: null,
      }),
    );

    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - 24 * 60 * 60 * 1000);
    const run = await digestRuns.save(
      digestRuns.create({
        channel: 'telegram',
        itemCount: 1,
        lookbackHours: 24,
        periodStart,
        periodEnd,
      }),
    );

    await digestItems.save(
      digestItems.create({
        digestRunId: run.id,
        articleId: article.id,
      }),
    );

    await expect(
      digestItems.save(
        digestItems.create({
          digestRunId: run.id,
          articleId: article.id,
        }),
      ),
    ).rejects.toBeInstanceOf(QueryFailedError);
  });

  it('should persist research hypotheses and enforce journal constraints', async () => {
    const hypothesis = await hypotheses.save(
      hypotheses.create({
        symbol: 'AAPL',
        bias: HypothesisBias.BULLISH,
        thesis: 'Services growth supports margins.',
        invalidation: 'Services growth falls below 5%.',
        horizonDays: 90,
        status: HypothesisStatus.OPEN,
        source: HypothesisSource.MANUAL,
        sourceRefId: null,
        closedAt: null,
        closeNote: null,
      }),
    );

    expect(hypothesis.id).toBeDefined();
    expect(hypothesis.status).toBe(HypothesisStatus.OPEN);

    await expect(
      hypotheses.save(
        hypotheses.create({
          symbol: 'MSFT',
          bias: HypothesisBias.WATCH,
          thesis: 'Cloud growth may reaccelerate.',
          invalidation: 'Cloud growth remains flat.',
          horizonDays: 0,
          status: HypothesisStatus.OPEN,
          source: HypothesisSource.BRIEF,
          sourceRefId: null,
          closedAt: null,
          closeNote: null,
        }),
      ),
    ).rejects.toBeInstanceOf(QueryFailedError);

    const brief = await researchBriefs.save(
      researchBriefs.create({
        symbol: 'AAPL',
        locale: 'en',
        sections: {
          overview: 'Overview',
          fundamental: 'Fundamental',
          technical: 'Technical',
          risks: 'Risk',
          invalidation: 'Invalidation',
          disclaimer: 'Research only.',
        },
        promptVersion: 'brief-v3',
        knowledgeVersion: '0.1.0',
        stance: 'watch',
        stanceRationale: 'Range-bound on verified closes; wait for catalysts.',
        marketAsOf: new Date('2026-07-17T12:00:00.000Z'),
        marketSource: 'yahoo-finance-chart',
        holdingId: null,
      }),
    );
    expect(brief.stance).toBe('watch');
    expect(brief.marketSource).toBe('yahoo-finance-chart');

    await researchBriefs.update(brief.id, {
      chartPng: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    });
    const withChart = await researchBriefs
      .createQueryBuilder('brief')
      .select('brief.id')
      .addSelect('brief.chartPng')
      .where('brief.id = :id', { id: brief.id })
      .getOne();
    expect(withChart?.chartPng?.length).toBe(4);

    const listed = await researchBriefs.findOne({ where: { id: brief.id } });
    expect(listed?.chartPng).toBeUndefined();

    const fromBrief = await hypotheses.save(
      hypotheses.create({
        symbol: 'AAPL',
        bias: HypothesisBias.WATCH,
        thesis: 'Track the brief thesis.',
        invalidation: 'Brief assumptions change.',
        horizonDays: 30,
        status: HypothesisStatus.OPEN,
        source: HypothesisSource.BRIEF,
        sourceRefId: brief.id,
        closedAt: null,
        closeNote: null,
      }),
    );
    expect(fromBrief.sourceRefId).toBe(brief.id);

    await expect(
      hypotheses.save(
        hypotheses.create({
          symbol: 'AAPL',
          bias: HypothesisBias.BULLISH,
          thesis: 'Duplicate link must fail.',
          invalidation: 'Should not insert.',
          horizonDays: 30,
          status: HypothesisStatus.OPEN,
          source: HypothesisSource.BRIEF,
          sourceRefId: brief.id,
          closedAt: null,
          closeNote: null,
        }),
      ),
    ).rejects.toBeInstanceOf(QueryFailedError);

    const secondManual = await hypotheses.save(
      hypotheses.create({
        symbol: 'MSFT',
        bias: HypothesisBias.WATCH,
        thesis: 'Manual hypotheses may omit source_ref_id.',
        invalidation: 'Still allowed when null.',
        horizonDays: 30,
        status: HypothesisStatus.OPEN,
        source: HypothesisSource.MANUAL,
        sourceRefId: null,
        closedAt: null,
        closeNote: null,
      }),
    );
    expect(secondManual.sourceRefId).toBeNull();
  });

  it('should persist hypothesis reviews linked to a run', async () => {
    const hypothesis = await hypotheses.save(
      hypotheses.create({
        symbol: 'AAPL',
        bias: HypothesisBias.BULLISH,
        thesis: 'Services growth supports margins.',
        invalidation: 'Services growth falls below 5%.',
        horizonDays: 90,
        status: HypothesisStatus.CLOSED,
        source: HypothesisSource.MANUAL,
        sourceRefId: null,
        closedAt: new Date('2026-01-20T00:00:00.000Z'),
        closeNote: 'Closed for review',
      }),
    );

    const run = await hypothesisReviewRuns.save(
      hypothesisReviewRuns.create({
        periodStart: new Date('2026-01-01T00:00:00.000Z'),
        periodEnd: new Date('2026-01-31T23:59:59.999Z'),
        reviewedCount: 1,
        skippedCount: 0,
        locale: 'en',
        summaryMessage: 'Review summary',
      }),
    );

    const review = await hypothesisReviews.save(
      hypothesisReviews.create({
        reviewRunId: run.id,
        hypothesisId: hypothesis.id,
        outcome: HypothesisReviewOutcome.INCONCLUSIVE,
        thesisQualityNote: 'Qualitative only',
        timingNote: 'Horizon not price-checked',
        learningNote: 'Revisit catalysts',
        explanation:
          'Numerical performance is unavailable. Not a backtest or investment advice.',
        priceReturnPct: null,
        priceStart: null,
        priceEnd: null,
        priceAsOf: null,
        marketSource: null,
        priceUnavailableReason: 'not_found',
        locale: 'en',
      }),
    );

    expect(review.id).toBeDefined();
    expect(review.outcome).toBe(HypothesisReviewOutcome.INCONCLUSIVE);

    await expect(
      hypothesisReviews.save(
        hypothesisReviews.create({
          reviewRunId: run.id,
          hypothesisId: hypothesis.id,
          outcome: HypothesisReviewOutcome.THESIS_CONFIRMED,
          thesisQualityNote: 'dup',
          timingNote: 'dup',
          learningNote: 'dup',
          explanation: 'dup',
          priceReturnPct: null,
          priceStart: null,
          priceEnd: null,
          priceAsOf: null,
          marketSource: null,
          priceUnavailableReason: null,
          locale: 'en',
        }),
      ),
    ).rejects.toBeInstanceOf(QueryFailedError);
  });

  it('should persist operator feedback against an analysis', async () => {
    const article = await articles.save(
      articles.create({
        title: 'Feedback fixture',
        url: 'https://example.com/feedback',
        content: 'body',
        source: 'fixture',
        contentHash: 'feedback-hash',
        publishedAt: new Date('2026-07-01T00:00:00.000Z'),
      }),
    );
    const analysis = await analyses.save(
      analyses.create({
        articleId: article.id,
        headline: 'Useful signal',
        summary: 'Summary',
        sentiment: 'bullish',
        tickers: ['AAPL'],
        materiality: 'high',
        eventType: 'earnings',
        model: 'mock',
        promptVersion: 'news-analysis-v2',
        knowledgeVersion: '0.1.0',
      }),
    );

    const feedback = await operatorFeedback.save(
      operatorFeedback.create({
        targetType: FeedbackTargetType.ANALYSIS,
        targetId: analysis.id,
        label: FeedbackLabel.USEFUL,
        promptVersion: analysis.promptVersion,
        knowledgeVersion: analysis.knowledgeVersion,
        actor: 'desk-operator',
      }),
    );

    expect(feedback.id).toBeDefined();
    expect(feedback.label).toBe(FeedbackLabel.USEFUL);
    expect(feedback.promptVersion).toBe('news-analysis-v2');
    expect(feedback.knowledgeVersion).toBe('0.1.0');
  });
});
