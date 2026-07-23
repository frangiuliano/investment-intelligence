import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { ResearchBrief } from '../brief/entities/research-brief.entity';
import { OperatorFeedback } from '../feedback/entities/operator-feedback.entity';
import { NewsArticle } from '../news/entities/news-article.entity';
import { NewsStoryClusterMember } from '../notifications/entities/news-story-cluster-member.entity';
import { NewsStoryCluster } from '../notifications/entities/news-story-cluster.entity';
import { DigestItem } from '../notifications/entities/digest-item.entity';
import { DigestRun } from '../notifications/entities/digest-run.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Holding } from '../portfolio/holdings/entities/holding.entity';
import { WatchlistEntry } from '../portfolio/watchlist/entities/watchlist-entry.entity';
import { Hypothesis } from '../research/hypotheses/entities/hypothesis.entity';
import { HypothesisReviewRun } from '../research/reviews/entities/hypothesis-review-run.entity';
import { HypothesisReview } from '../research/reviews/entities/hypothesis-review.entity';
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
