import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { AppLocale } from '../config/env.validation';
import { RelevanceService } from '../relevance/relevance.service';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { TelegramClient } from './telegram.client';
import { TELEGRAM_CHANNEL } from './telegram.constants';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let sendMessage: jest.Mock;
  let evaluate: jest.Mock;
  let createQueryBuilder: jest.Mock;
  let findOne: jest.Mock;
  let exists: jest.Mock;
  let create: jest.Mock;
  let save: jest.Mock;
  let getMany: jest.Mock;
  let locale: AppLocale;

  const article = {
    id: 'article-1',
    title: 'Oil slides',
    url: 'https://news.example.com/oil',
  };

  const analysis = {
    articleId: 'article-1',
    sentiment: 'negative',
    summary: 'Crude fell on inventory data.',
    tickers: ['XOM'],
    materiality: 'high',
    article,
  };

  beforeEach(async () => {
    locale = 'en';
    sendMessage = jest.fn().mockResolvedValue(undefined);
    evaluate = jest.fn().mockReturnValue({
      isRelevant: true,
      reason: 'non-neutral sentiment with tickers and materiality',
    });
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
          },
        },
        {
          provide: TelegramClient,
          useValue: { sendMessage },
        },
        {
          provide: RelevanceService,
          useValue: { evaluate },
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
      expect(save).toHaveBeenCalledWith({
        articleId: 'article-1',
        channel: TELEGRAM_CHANNEL,
        payload: {
          title: 'Oil slides',
          summary: 'Crude fell on inventory data.',
          sentiment: 'negative',
          tickers: ['XOM'],
          url: 'https://news.example.com/oil',
        },
      });
    });

    it('should localize alert labels when APP_LOCALE is es', async () => {
      locale = 'es';

      await service.notifyRelevant();

      const [[message]] = sendMessage.mock.calls as [[string]];
      expect(message).toContain('Título: Oil slides');
      expect(message).toContain('Resumen: Crude fell on inventory data.');
      expect(message).toContain('Sentimiento: negative');
      expect(message).not.toContain('Title:');
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
