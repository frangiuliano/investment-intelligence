import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { RelevanceService } from './relevance.service';

describe('RelevanceService', () => {
  let service: RelevanceService;
  let configGet: jest.Mock;
  let analysisFindOne: jest.Mock;
  let notificationsExists: jest.Mock;
  let createQueryBuilder: jest.Mock;
  let getMany: jest.Mock;

  beforeEach(async () => {
    configGet = jest.fn().mockReturnValue([]);
    analysisFindOne = jest.fn();
    notificationsExists = jest.fn();
    getMany = jest.fn();
    createQueryBuilder = jest.fn().mockReturnValue({
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RelevanceService,
        {
          provide: ConfigService,
          useValue: { get: configGet },
        },
        {
          provide: getRepositoryToken(NewsAnalysis),
          useValue: { findOne: analysisFindOne, createQueryBuilder },
        },
        {
          provide: getRepositoryToken(Notification),
          useValue: { exists: notificationsExists },
        },
      ],
    }).compile();

    service = module.get(RelevanceService);
  });

  describe('evaluate', () => {
    it('should return false when already notified', () => {
      const result = service.evaluate({
        sentiment: 'positive',
        tickers: ['AAPL'],
        materiality: 'high',
        alreadyNotified: true,
      });

      expect(result).toEqual({
        isRelevant: false,
        reason: 'already notified',
      });
    });

    it('should return false when sentiment is neutral', () => {
      const result = service.evaluate({
        sentiment: 'neutral',
        tickers: ['AAPL'],
        materiality: 'high',
        alreadyNotified: false,
      });

      expect(result).toEqual({
        isRelevant: false,
        reason: 'neutral sentiment',
      });
    });

    it('should return false when tickers are empty', () => {
      const result = service.evaluate({
        sentiment: 'positive',
        tickers: [],
        materiality: 'high',
        alreadyNotified: false,
      });

      expect(result).toEqual({
        isRelevant: false,
        reason: 'no tickers',
      });
    });

    it('should return false when sentiment is not a known value', () => {
      const result = service.evaluate({
        sentiment: 'bullish',
        tickers: ['AAPL'],
        materiality: 'high',
        alreadyNotified: false,
      });

      expect(result).toEqual({
        isRelevant: false,
        reason: 'invalid sentiment',
      });
    });

    it('should return false when materiality is low', () => {
      const result = service.evaluate({
        sentiment: 'negative',
        tickers: ['AAPL'],
        materiality: 'low',
        alreadyNotified: false,
      });

      expect(result).toEqual({
        isRelevant: false,
        reason: 'low materiality',
      });
    });

    it('should return false when materiality is invalid', () => {
      const result = service.evaluate({
        sentiment: 'positive',
        tickers: ['AAPL'],
        materiality: 'critical',
        alreadyNotified: false,
      });

      expect(result).toEqual({
        isRelevant: false,
        reason: 'invalid materiality',
      });
    });

    it('should return true when sentiment is non-neutral with tickers and high materiality', () => {
      const result = service.evaluate({
        sentiment: 'negative',
        tickers: ['MSFT'],
        materiality: 'high',
        alreadyNotified: false,
      });

      expect(result).toEqual({
        isRelevant: true,
        reason: 'non-neutral sentiment with tickers and materiality',
      });
    });

    it('should return true when materiality is medium with tickers', () => {
      const result = service.evaluate({
        sentiment: 'positive',
        tickers: ['AAPL'],
        materiality: 'medium',
        alreadyNotified: false,
      });

      expect(result).toEqual({
        isRelevant: true,
        reason: 'non-neutral sentiment with tickers and materiality',
      });
    });

    it('should return false when watchlist is set and no ticker matches', () => {
      configGet.mockReturnValue(['AAPL', 'GOOG']);

      const result = service.evaluate({
        sentiment: 'positive',
        tickers: ['MSFT'],
        materiality: 'high',
        alreadyNotified: false,
      });

      expect(result).toEqual({
        isRelevant: false,
        reason: 'no watchlist tickers',
      });
    });

    it('should return true when watchlist matches at least one ticker', () => {
      configGet.mockReturnValue(['AAPL', 'GOOG']);

      const result = service.evaluate({
        sentiment: 'positive',
        tickers: ['msft', 'aapl'],
        materiality: 'HIGH',
        alreadyNotified: false,
      });

      expect(result).toEqual({
        isRelevant: true,
        reason: 'non-neutral sentiment with tickers and materiality',
      });
    });
  });

  describe('evaluateArticle', () => {
    it('should return null when analysis is missing', async () => {
      analysisFindOne.mockResolvedValue(null);

      await expect(service.evaluateArticle('article-1')).resolves.toBeNull();
      expect(notificationsExists).not.toHaveBeenCalled();
    });

    it('should load analysis and notification state then evaluate', async () => {
      analysisFindOne.mockResolvedValue({
        articleId: 'article-1',
        sentiment: 'positive',
        tickers: ['AAPL'],
        materiality: 'medium',
      });
      notificationsExists.mockResolvedValue(false);

      await expect(service.evaluateArticle('article-1')).resolves.toEqual({
        isRelevant: true,
        reason: 'non-neutral sentiment with tickers and materiality',
      });

      expect(analysisFindOne).toHaveBeenCalledWith({
        where: { articleId: 'article-1' },
      });
      expect(notificationsExists).toHaveBeenCalledWith({
        where: { articleId: 'article-1' },
      });
    });
  });

  describe('evaluatePending', () => {
    it('should count relevant and not relevant pending analyses', async () => {
      getMany.mockResolvedValue([
        {
          articleId: 'article-1',
          sentiment: 'positive',
          tickers: ['AAPL'],
          materiality: 'high',
        },
        {
          articleId: 'article-2',
          sentiment: 'neutral',
          tickers: ['MSFT'],
          materiality: 'high',
        },
        {
          articleId: 'article-3',
          sentiment: 'negative',
          tickers: ['XOM'],
          materiality: 'low',
        },
      ]);
      notificationsExists.mockResolvedValue(false);

      await expect(service.evaluatePending()).resolves.toEqual({
        candidates: 3,
        relevant: 1,
        notRelevant: 2,
      });
    });
  });
});
