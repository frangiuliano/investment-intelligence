import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { AppLocale } from '../config/env.validation';
import { RelevanceService } from '../relevance/relevance.service';
import { Notification } from './entities/notification.entity';
import { StoryClusterService } from './story-cluster.service';
import {
  DEFAULT_STORY_CLUSTER_WINDOW_HOURS,
  StoryCandidate,
} from './story-similarity';
import {
  formatTelegramAlert,
  formatTelegramTestMessage,
} from './telegram-message';
import { TelegramApiError, TelegramClient } from './telegram.client';
import { TELEGRAM_CHANNEL } from './telegram.constants';

export type NotifyRunResult = {
  candidates: number;
  sent: number;
  skipped: number;
  errors: number;
};

export type NotifyArticleResult = 'sent' | 'skipped' | 'errors';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private running = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly telegramClient: TelegramClient,
    private readonly relevanceService: RelevanceService,
    private readonly storyClusterService: StoryClusterService,
    @InjectRepository(NewsAnalysis)
    private readonly newsAnalyses: Repository<NewsAnalysis>,
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
  ) {}

  async notifyRelevant(): Promise<NotifyRunResult> {
    if (this.running) {
      this.logger.warn(
        'Notification run already in progress; skipping overlapping run',
      );
      return { candidates: 0, sent: 0, skipped: 0, errors: 0 };
    }

    this.running = true;
    const result: NotifyRunResult = {
      candidates: 0,
      sent: 0,
      skipped: 0,
      errors: 0,
    };
    const alertedThisRun: Array<StoryCandidate & { clusterId: string }> = [];

    try {
      const analyses = await this.findUnnotifiedAnalyses();
      result.candidates = analyses.length;

      for (const analysis of analyses) {
        const outcome = await this.notifyAnalysis(analysis, alertedThisRun);
        result[outcome] += 1;
      }

      this.logger.log(
        `Notifications finished: candidates=${result.candidates} sent=${result.sent} skipped=${result.skipped} errors=${result.errors}`,
      );
      return result;
    } finally {
      this.running = false;
    }
  }

  async notifyArticle(articleId: string): Promise<NotifyArticleResult> {
    const analysis = await this.newsAnalyses.findOne({
      where: { articleId },
      relations: { article: true },
    });

    if (!analysis?.article) {
      this.logger.debug(`No analysis found for article ${articleId}`);
      return 'skipped';
    }

    return this.notifyAnalysis(analysis, []);
  }

  async sendTestMessage(): Promise<void> {
    const locale = this.configService.getOrThrow<AppLocale>('locale');
    await this.telegramClient.sendMessage(formatTelegramTestMessage(locale));
    this.logger.log('Telegram test message sent');
  }

  private async findUnnotifiedAnalyses(): Promise<NewsAnalysis[]> {
    return this.newsAnalyses
      .createQueryBuilder('analysis')
      .innerJoinAndSelect('analysis.article', 'article')
      .leftJoin('article.notifications', 'notification')
      .where('notification.id IS NULL')
      .orderBy('analysis.analyzedAt', 'ASC')
      .getMany();
  }

  private async notifyAnalysis(
    analysis: NewsAnalysis,
    alertedThisRun: Array<StoryCandidate & { clusterId: string }>,
  ): Promise<NotifyArticleResult> {
    const article = analysis.article;
    if (!article) {
      return 'skipped';
    }

    const alreadyNotified = await this.notifications.exists({
      where: { articleId: analysis.articleId },
    });
    const watchlistTickers =
      await this.relevanceService.resolveWatchlistTickers();

    const relevance = this.relevanceService.evaluate({
      sentiment: analysis.sentiment,
      tickers: analysis.tickers ?? [],
      materiality: analysis.materiality,
      eventType: analysis.eventType,
      alreadyNotified,
      watchlistTickers,
    });

    if (!relevance.isRelevant) {
      this.logger.debug(
        `Skipping article ${analysis.articleId}: ${relevance.reason}`,
      );
      return 'skipped';
    }

    const candidate = this.storyClusterService.toCandidate(analysis);
    if (!candidate) {
      return 'skipped';
    }

    const windowHours = this.resolveWindowHours();
    const sameRunMatch = this.storyClusterService.findMatchInCandidates(
      candidate,
      alertedThisRun,
      windowHours,
    );
    if (sameRunMatch) {
      return this.suppressDuplicateStory(
        analysis,
        sameRunMatch.clusterId,
        sameRunMatch.articleId,
      );
    }

    const priorMatch = await this.storyClusterService.findMatchingAlertedStory(
      candidate,
      windowHours,
    );
    if (priorMatch) {
      return this.suppressDuplicateStory(
        analysis,
        priorMatch.clusterId,
        priorMatch.matchedArticleId,
      );
    }

    const existingClusterId =
      await this.storyClusterService.findAlertedClusterId(analysis.articleId);
    if (existingClusterId) {
      return this.persistAlertNotification(
        analysis,
        candidate,
        existingClusterId,
        alertedThisRun,
        { skipTelegram: true },
      );
    }

    const locale = this.configService.getOrThrow<AppLocale>('locale');
    const message = formatTelegramAlert(
      {
        title: article.title,
        summary: analysis.summary,
        sentiment: analysis.sentiment,
        tickers: analysis.tickers ?? [],
        url: article.url,
        eventType: analysis.eventType,
      },
      locale,
    );
    try {
      await this.telegramClient.sendMessage(message);
    } catch (error) {
      this.logger.error(
        `Failed to notify article ${analysis.articleId}: ${errorMessage(error)}`,
      );
      return 'errors';
    }

    let clusterId: string;
    try {
      clusterId = await this.storyClusterService.ensureClusterForAlertedArticle(
        analysis.articleId,
      );
    } catch (error) {
      this.logger.error(
        `Telegram sent for article ${analysis.articleId} but cluster persist failed: ${errorMessage(error)}`,
      );
      return 'errors';
    }

    return this.persistAlertNotification(
      analysis,
      candidate,
      clusterId,
      alertedThisRun,
      { skipTelegram: false },
    );
  }

  private async persistAlertNotification(
    analysis: NewsAnalysis,
    candidate: StoryCandidate,
    clusterId: string,
    alertedThisRun: Array<StoryCandidate & { clusterId: string }>,
    options: { skipTelegram: boolean },
  ): Promise<NotifyArticleResult> {
    const article = analysis.article;
    if (!article) {
      return 'skipped';
    }

    try {
      await this.notifications.save(
        this.notifications.create({
          articleId: analysis.articleId,
          channel: TELEGRAM_CHANNEL,
          payload: {
            title: article.title,
            summary: analysis.summary,
            sentiment: analysis.sentiment,
            tickers: analysis.tickers ?? [],
            url: article.url,
            eventType: analysis.eventType,
            clusterId,
          },
        }),
      );
    } catch (error) {
      this.logger.error(
        options.skipTelegram
          ? `Recovered Telegram send for article ${analysis.articleId} but notification persist failed: ${errorMessage(error)}`
          : `Telegram sent for article ${analysis.articleId} but notification persist failed: ${errorMessage(error)}`,
      );
      return 'errors';
    }

    alertedThisRun.push({ ...candidate, clusterId });
    this.logger.log(
      options.skipTelegram
        ? `Recovered notification persist for article ${analysis.articleId} (skipped duplicate Telegram send)`
        : `Notified article ${analysis.articleId} via Telegram`,
    );
    return 'sent';
  }

  private async suppressDuplicateStory(
    analysis: NewsAnalysis,
    clusterId: string,
    matchedArticleId: string,
  ): Promise<NotifyArticleResult> {
    try {
      await this.storyClusterService.addSuppressedMember(
        clusterId,
        analysis.articleId,
      );
      await this.notifications.save(
        this.notifications.create({
          articleId: analysis.articleId,
          channel: TELEGRAM_CHANNEL,
          payload: {
            suppressed: true,
            reason: 'duplicate_story',
            clusterId,
            matchedArticleId,
          },
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to suppress duplicate story for article ${analysis.articleId}: ${errorMessage(error)}`,
      );
      return 'errors';
    }

    this.logger.log(
      `Suppressed duplicate story alert for article ${analysis.articleId} (matched ${matchedArticleId}, cluster ${clusterId})`,
    );
    return 'skipped';
  }

  private resolveWindowHours(): number {
    const configured = this.configService.get<number>(
      'storyCluster.windowHours',
    );
    if (
      typeof configured === 'number' &&
      Number.isFinite(configured) &&
      configured > 0
    ) {
      return configured;
    }
    return DEFAULT_STORY_CLUSTER_WINDOW_HOURS;
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof TelegramApiError) {
    return error.message;
  }
  return error instanceof Error ? error.message : String(error);
}
