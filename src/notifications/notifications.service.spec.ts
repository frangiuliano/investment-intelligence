import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { AppLocale } from '../config/env.validation';
import { RelevanceService } from '../relevance/relevance.service';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { StoryClusterService } from './story-cluster.service';
import { TelegramClient } from './telegram.client';
import { TELEGRAM_CHANNEL } from './telegram.constants';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let sendMessage: jest.Mock;
  let evaluate: jest.Mock;
  let resolveWatchlistTickers: jest.Mock;
  let createQueryBuilder: jest.Mock;
  let findOne: jest.Mock;
  let exists: jest.Mock;
  let create: jest.Mock;
  let save: jest.Mock;
  let getMany: jest.Mock;
  let locale: AppLocale;
  let toCandidate: jest.Mock;
  let findMatchInCandidates: jest.Mock;
  let findMatchingAlertedStory: jest.Mock;
  let findAlertedClusterId: jest.Mock;
  let ensureClusterForAlertedArticle: jest.Mock;
  let addSuppressedMember: jest.Mock;

  const article = {
    id: 'article-1',
    title: 'Oil slides',
    url: 'https://news.example.com/oil',
    publishedAt: new Date('2026-07-14T10:00:00.000Z'),
  };

  const analysis = {
    articleId: 'article-1',
    headline: '',
    sentiment: 'negative',
    summary: 'Crude fell on inventory data.',
    tickers: ['XOM'],
    materiality: 'high',
    eventType: 'none',
    analyzedAt: new Date('2026-07-14T10:05:00.000Z'),
    article,
  };

  const candidate = {
    articleId: 'article-1',
    title: article.title,
    summary: analysis.summary,
    tickers: analysis.tickers,
    eventType: analysis.eventType,
    referenceAt: article.publishedAt,
  };

  beforeEach(async () => {
    locale = 'en';
    sendMessage = jest.fn().mockResolvedValue(undefined);
    evaluate = jest.fn().mockReturnValue({
      isRelevant: true,
      reason: 'non-neutral sentiment with tickers and materiality',
    });
    resolveWatchlistTickers = jest.fn().mockResolvedValue([]);
    getMany = jest.fn().mockResolvedValue([analysis]);
    createQueryBuilder = jest.fn().mockReturnValue({
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany,
    });
    findOne = jest.fn();
    exists = jest.fn().mockResolvedValue(false);
    create = jest.fn((value: unknown) => value);
    save = jest.fn().mockResolvedValue({ id: 'notif-1' });
    toCandidate = jest.fn().mockReturnValue(candidate);
    findMatchInCandidates = jest.fn().mockReturnValue(null);
    findMatchingAlertedStory = jest.fn().mockResolvedValue(null);
    findAlertedClusterId = jest.fn().mockResolvedValue(null);
    ensureClusterForAlertedArticle = jest.fn().mockResolvedValue('cluster-1');
    addSuppressedMember = jest.fn().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              if (key === 'locale') {
                return locale;
              }
              throw new Error(`Unexpected config key: ${key}`);
            },
            get: (key: string) => {
              if (key === 'storyCluster.windowHours') {
                return 24;
              }
              return undefined;
            },
          },
        },
        {
          provide: TelegramClient,
          useValue: { sendMessage },
        },
        {
          provide: RelevanceService,
          useValue: { evaluate, resolveWatchlistTickers },
        },
        {
          provide: StoryClusterService,
          useValue: {
            toCandidate,
            findMatchInCandidates,
            findMatchingAlertedStory,
            findAlertedClusterId,
            ensureClusterForAlertedArticle,
            addSuppressedMember,
          },
        },
        {
          provide: getRepositoryToken(NewsAnalysis),
          useValue: { createQueryBuilder, findOne },
        },
        {
          provide: getRepositoryToken(Notification),
          useValue: { exists, create, save },
        },
      ],
    }).compile();

    service = module.get(NotificationsService);
  });

  describe('notifyRelevant', () => {
    it('should send Telegram message and persist notification for relevant articles', async () => {
      const result = await service.notifyRelevant();

      expect(result).toEqual({
        candidates: 1,
        sent: 1,
        skipped: 0,
        errors: 0,
      });
      expect(sendMessage).toHaveBeenCalledTimes(1);
      const [[message]] = sendMessage.mock.calls as [[string]];
      expect(message).toContain('Title: Oil slides');
      expect(message).toContain('Summary: Crude fell on inventory data.');
      expect(message).toContain('Sentiment: negative');
      expect(message).toContain('Tickers: XOM');
      expect(message).toContain('URL: https://news.example.com/oil');
      expect(ensureClusterForAlertedArticle).toHaveBeenCalledWith('article-1');
      expect(save).toHaveBeenCalledWith({
        articleId: 'article-1',
        channel: TELEGRAM_CHANNEL,
        payload: {
          title: 'Oil slides',
          summary: 'Crude fell on inventory data.',
          sentiment: 'negative',
          tickers: ['XOM'],
          url: 'https://news.example.com/oil',
          eventType: 'none',
          clusterId: 'cluster-1',
        },
      });
    });

    it('should recover notification persist without re-sending Telegram when cluster already alerted', async () => {
      findAlertedClusterId.mockResolvedValue('cluster-recovered');
      findMatchingAlertedStory.mockResolvedValue({
        clusterId: 'cluster-other',
        matchedArticleId: 'article-other',
      });

      const result = await service.notifyRelevant();

      expect(result).toEqual({
        candidates: 1,
        sent: 1,
        skipped: 0,
        errors: 0,
      });
      expect(sendMessage).not.toHaveBeenCalled();
      expect(findMatchingAlertedStory).not.toHaveBeenCalled();
      expect(addSuppressedMember).not.toHaveBeenCalled();
      expect(ensureClusterForAlertedArticle).not.toHaveBeenCalled();
      expect(save).toHaveBeenCalledWith({
        articleId: 'article-1',
        channel: TELEGRAM_CHANNEL,
        payload: {
          title: 'Oil slides',
          summary: 'Crude fell on inventory data.',
          sentiment: 'negative',
          tickers: ['XOM'],
          url: 'https://news.example.com/oil',
          eventType: 'none',
          clusterId: 'cluster-recovered',
        },
      });
    });

    it('should suppress a sibling when a prior article left an alerted cluster without notification', async () => {
      findMatchingAlertedStory.mockResolvedValue({
        clusterId: 'cluster-a',
        matchedArticleId: 'article-prior',
      });

      const result = await service.notifyRelevant();

      expect(result).toEqual({
        candidates: 1,
        sent: 0,
        skipped: 1,
        errors: 0,
      });
      expect(sendMessage).not.toHaveBeenCalled();
      expect(addSuppressedMember).toHaveBeenCalledWith(
        'cluster-a',
        'article-1',
      );
      expect(save).toHaveBeenCalledWith({
        articleId: 'article-1',
        channel: TELEGRAM_CHANNEL,
        payload: {
          suppressed: true,
          reason: 'duplicate_story',
          clusterId: 'cluster-a',
          matchedArticleId: 'article-prior',
        },
      });
    });

    it('should keep siblings from pushing when notification persist fails after Telegram', async () => {
      const secondArticle = {
        id: 'article-2',
        title: 'Oil slides after inventory surprise',
        url: 'https://other.example.com/oil',
        publishedAt: new Date('2026-07-14T11:00:00.000Z'),
      };
      const secondAnalysis = {
        articleId: 'article-2',
        headline: '',
        sentiment: 'negative',
        summary: 'Crude fell on inventory data from a second source.',
        tickers: ['XOM'],
        materiality: 'high',
        eventType: 'none',
        analyzedAt: new Date('2026-07-14T11:05:00.000Z'),
        article: secondArticle,
      };
      const secondCandidate = {
        articleId: 'article-2',
        title: secondArticle.title,
        summary: secondAnalysis.summary,
        tickers: secondAnalysis.tickers,
        eventType: secondAnalysis.eventType,
        referenceAt: secondArticle.publishedAt,
      };

      getMany.mockResolvedValue([analysis, secondAnalysis]);
      toCandidate
        .mockReturnValueOnce(candidate)
        .mockReturnValueOnce(secondCandidate);
      save
        .mockRejectedValueOnce(new Error('db down'))
        .mockResolvedValueOnce({ id: 'notif-2' });
      findMatchInCandidates
        .mockReturnValueOnce(null)
        .mockReturnValueOnce({ ...candidate, clusterId: 'cluster-1' });

      const result = await service.notifyRelevant();

      expect(result).toEqual({
        candidates: 2,
        sent: 0,
        skipped: 1,
        errors: 1,
      });
      expect(sendMessage).toHaveBeenCalledTimes(1);
      expect(addSuppressedMember).toHaveBeenCalledWith(
        'cluster-1',
        'article-2',
      );
    });

    it('should localize alert labels when APP_LOCALE is es', async () => {
      locale = 'es';

      await service.notifyRelevant();

      const [[message]] = sendMessage.mock.calls as [[string]];
      expect(message).toContain('Título: Oil slides');
      expect(message).toContain('Resumen: Crude fell on inventory data.');
      expect(message).toContain('Sentimiento: negativo');
      expect(message).not.toContain('Title:');
    });

    it('should use persisted Spanish headline in Telegram alerts', async () => {
      locale = 'es';
      getMany.mockResolvedValue([
        {
          ...analysis,
          headline: 'El petróleo baja por inventarios',
        },
      ]);

      await service.notifyRelevant();

      const [[message]] = sendMessage.mock.calls as [[string]];
      expect(message).toContain('Título: El petróleo baja por inventarios');
      expect(message).not.toContain('Título: Oil slides');
      expect(save).toHaveBeenCalledWith({
        articleId: 'article-1',
        channel: TELEGRAM_CHANNEL,
        payload: {
          title: 'El petróleo baja por inventarios',
          summary: 'Crude fell on inventory data.',
          sentiment: 'negative',
          tickers: ['XOM'],
          url: 'https://news.example.com/oil',
          eventType: 'none',
          clusterId: 'cluster-1',
        },
      });
    });

    it('should skip non-relevant articles without sending', async () => {
      evaluate.mockReturnValue({
        isRelevant: false,
        reason: 'neutral sentiment',
      });

      const result = await service.notifyRelevant();

      expect(result).toEqual({
        candidates: 1,
        sent: 0,
        skipped: 1,
        errors: 0,
      });
      expect(sendMessage).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    });

    it('should skip already notified articles', async () => {
      exists.mockResolvedValue(true);
      evaluate.mockReturnValue({
        isRelevant: false,
        reason: 'already notified',
      });

      const result = await service.notifyRelevant();

      expect(result.skipped).toBe(1);
      expect(sendMessage).not.toHaveBeenCalled();
      expect(evaluate).toHaveBeenCalledWith(
        expect.objectContaining({ alreadyNotified: true }),
      );
    });

    it('should suppress a duplicate story without a second Telegram send', async () => {
      const secondArticle = {
        id: 'article-2',
        title: 'Oil slides after inventory surprise',
        url: 'https://other.example.com/oil',
        publishedAt: new Date('2026-07-14T11:00:00.000Z'),
      };
      const secondAnalysis = {
        articleId: 'article-2',
        headline: '',
        sentiment: 'negative',
        summary: 'Crude fell on inventory data from a second source.',
        tickers: ['XOM'],
        materiality: 'high',
        eventType: 'none',
        analyzedAt: new Date('2026-07-14T11:05:00.000Z'),
        article: secondArticle,
      };
      const secondCandidate = {
        articleId: 'article-2',
        title: secondArticle.title,
        summary: secondAnalysis.summary,
        tickers: secondAnalysis.tickers,
        eventType: secondAnalysis.eventType,
        referenceAt: secondArticle.publishedAt,
      };

      getMany.mockResolvedValue([analysis, secondAnalysis]);
      toCandidate
        .mockReturnValueOnce(candidate)
        .mockReturnValueOnce(secondCandidate);
      findMatchInCandidates
        .mockReturnValueOnce(null)
        .mockReturnValueOnce({ ...candidate, clusterId: 'cluster-1' });

      const result = await service.notifyRelevant();

      expect(result).toEqual({
        candidates: 2,
        sent: 1,
        skipped: 1,
        errors: 0,
      });
      expect(sendMessage).toHaveBeenCalledTimes(1);
      expect(addSuppressedMember).toHaveBeenCalledWith(
        'cluster-1',
        'article-2',
      );
      expect(save).toHaveBeenCalledWith({
        articleId: 'article-2',
        channel: TELEGRAM_CHANNEL,
        payload: {
          suppressed: true,
          reason: 'duplicate_story',
          clusterId: 'cluster-1',
          matchedArticleId: 'article-1',
        },
      });
    });

    it('should suppress when a prior alerted story matches', async () => {
      findMatchingAlertedStory.mockResolvedValue({
        clusterId: 'cluster-prior',
        matchedArticleId: 'article-prior',
      });

      const result = await service.notifyRelevant();

      expect(result).toEqual({
        candidates: 1,
        sent: 0,
        skipped: 1,
        errors: 0,
      });
      expect(sendMessage).not.toHaveBeenCalled();
      expect(addSuppressedMember).toHaveBeenCalledWith(
        'cluster-prior',
        'article-1',
      );
    });

    it('should count errors when Telegram send fails', async () => {
      sendMessage.mockRejectedValue(new Error('network down'));

      const result = await service.notifyRelevant();

      expect(result).toEqual({
        candidates: 1,
        sent: 0,
        skipped: 0,
        errors: 1,
      });
      expect(save).not.toHaveBeenCalled();
    });

    it('should persist notification when cluster persist fails after Telegram', async () => {
      ensureClusterForAlertedArticle.mockRejectedValue(
        new Error('cluster db down'),
      );

      const result = await service.notifyRelevant();

      expect(result).toEqual({
        candidates: 1,
        sent: 1,
        skipped: 0,
        errors: 0,
      });
      expect(sendMessage).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith({
        articleId: 'article-1',
        channel: TELEGRAM_CHANNEL,
        payload: {
          title: 'Oil slides',
          summary: 'Crude fell on inventory data.',
          sentiment: 'negative',
          tickers: ['XOM'],
          url: 'https://news.example.com/oil',
          eventType: 'none',
          clusterPersistFailed: true,
        },
      });
    });

    it('should not send Telegram again on a later run after cluster-fail notification persist', async () => {
      ensureClusterForAlertedArticle.mockRejectedValue(
        new Error('cluster db down'),
      );
      getMany.mockResolvedValueOnce([analysis]).mockResolvedValueOnce([]);

      await service.notifyRelevant();
      const second = await service.notifyRelevant();

      expect(sendMessage).toHaveBeenCalledTimes(1);
      expect(second).toEqual({
        candidates: 0,
        sent: 0,
        skipped: 0,
        errors: 0,
      });
    });

    it('should not send again while a run is in progress', async () => {
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      sendMessage.mockImplementation(() => gate);

      const first = service.notifyRelevant();
      await Promise.resolve();
      await Promise.resolve();

      const second = await service.notifyRelevant();
      release();
      await first;

      expect(second).toEqual({
        candidates: 0,
        sent: 0,
        skipped: 0,
        errors: 0,
      });
    });
  });

  describe('notifyArticle', () => {
    it('should skip when analysis is missing', async () => {
      findOne.mockResolvedValue(null);

      await expect(service.notifyArticle('missing')).resolves.toBe('skipped');
      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('should notify a specific article when relevant', async () => {
      findOne.mockResolvedValue(analysis);

      await expect(service.notifyArticle('article-1')).resolves.toBe('sent');
      expect(sendMessage).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendTestMessage', () => {
    it('should send a test message without persisting', async () => {
      await service.sendTestMessage();

      expect(sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('test notification'),
      );
      expect(save).not.toHaveBeenCalled();
    });

    it('should send a Spanish test message when APP_LOCALE is es', async () => {
      locale = 'es';

      await service.sendTestMessage();

      expect(sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('notificación de prueba'),
      );
      expect(save).not.toHaveBeenCalled();
    });
  });
});
