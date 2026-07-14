import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { NewsStoryClusterMember } from './entities/news-story-cluster-member.entity';
import { NewsStoryCluster } from './entities/news-story-cluster.entity';
import {
  areSameStory,
  resolveStoryReferenceAt,
  StoryCandidate,
} from './story-similarity';

export type MatchedStoryCluster = {
  clusterId: string;
  matchedArticleId: string;
};

@Injectable()
export class StoryClusterService {
  constructor(
    @InjectRepository(NewsStoryCluster)
    private readonly clusters: Repository<NewsStoryCluster>,
    @InjectRepository(NewsStoryClusterMember)
    private readonly members: Repository<NewsStoryClusterMember>,
    @InjectRepository(NewsAnalysis)
    private readonly newsAnalyses: Repository<NewsAnalysis>,
  ) {}

  toCandidate(analysis: NewsAnalysis): StoryCandidate | null {
    const article = analysis.article;
    if (!article) {
      return null;
    }

    return {
      articleId: analysis.articleId,
      title: article.title,
      summary: analysis.summary,
      tickers: analysis.tickers ?? [],
      eventType: analysis.eventType,
      referenceAt: resolveStoryReferenceAt({
        publishedAt: article.publishedAt,
        analyzedAt: analysis.analyzedAt,
      }),
    };
  }

  findMatchInCandidates<T extends StoryCandidate>(
    candidate: StoryCandidate,
    others: T[],
    windowHours: number,
  ): T | null {
    for (const other of others) {
      if (
        areSameStory(candidate, other, {
          windowHours,
        })
      ) {
        return other;
      }
    }
    return null;
  }

  async findMatchingAlertedStory(
    candidate: StoryCandidate,
    windowHours: number,
  ): Promise<MatchedStoryCluster | null> {
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const alerted = await this.newsAnalyses
      .createQueryBuilder('analysis')
      .innerJoinAndSelect('analysis.article', 'article')
      .innerJoin('article.notifications', 'notification')
      .where('notification.sent_at >= :since', { since })
      .andWhere(`(notification.payload->>'suppressed') IS DISTINCT FROM 'true'`)
      .getMany();

    for (const analysis of alerted) {
      const other = this.toCandidate(analysis);
      if (!other) {
        continue;
      }

      if (
        !areSameStory(candidate, other, {
          windowHours,
        })
      ) {
        continue;
      }

      const clusterId = await this.ensureClusterForAlertedArticle(
        other.articleId,
      );
      return { clusterId, matchedArticleId: other.articleId };
    }

    return null;
  }

  async ensureClusterForAlertedArticle(articleId: string): Promise<string> {
    const existing = await this.members.findOne({
      where: { articleId },
    });
    if (existing) {
      if (!existing.alerted) {
        existing.alerted = true;
        await this.members.save(existing);
      }
      return existing.clusterId;
    }

    return this.createAlertedCluster(articleId);
  }

  async createAlertedCluster(articleId: string): Promise<string> {
    const cluster = await this.clusters.save(this.clusters.create());
    await this.members.save(
      this.members.create({
        clusterId: cluster.id,
        articleId,
        alerted: true,
      }),
    );
    return cluster.id;
  }

  async addSuppressedMember(
    clusterId: string,
    articleId: string,
  ): Promise<void> {
    const existing = await this.members.findOne({
      where: { articleId },
    });
    if (existing) {
      return;
    }

    await this.members.save(
      this.members.create({
        clusterId,
        articleId,
        alerted: false,
      }),
    );
  }
}
