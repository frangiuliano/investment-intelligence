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

  beforeEach(async () => {
    configGet = jest.fn().mockReturnValue([]);
    analysisFindOne = jest.fn();
    notificationsExists = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RelevanceService,
        {
          provide: ConfigService,
          useValue: { get: configGet },
        },
        {
          provide: getRepositoryToken(NewsAnalysis),
          useValue: { findOne: analysisFindOne },
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
    it('should return false when sentiment is neutral', () => {
      const result = service.evaluate({
        sentiment: 'neutral',
        tickers: ['AAPL'],
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
        alreadyNotified: false,
      });

      expect(result).toEqual({
        isRelevant: false,
        reason: 'invalid sentiment',
      });
    });

    it('should return true when sentiment is non-neutral and has tickers', () => {
      const result = service.evaluate({
        sentiment: 'negative',
        tickers: ['MSFT'],
        alreadyNotified: false,
      });

      expect(result).toEqual({
        isRelevant: true,
        reason: 'non-neutral sentiment with tickers',
      });
    });

    it('should return false when already notified', () => {
      const result = service.evaluate({
        sentiment: 'positive',
        tickers: ['AAPL'],
        alreadyNotified: true,
      });

      expect(result).toEqual({
        isRelevant: false,
        reason: 'already notified',
      });
    });

    it('should return false when watchlist is set and no ticker matches', () => {
      configGet.mockReturnValue(['AAPL', 'GOOG']);

      const result = service.evaluate({
        sentiment: 'positive',
        tickers: ['MSFT'],
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
        alreadyNotified: false,
      });

      expect(result).toEqual({
        isRelevant: true,
        reason: 'non-neutral sentiment with tickers',
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
      });
      notificationsExists.mockResolvedValue(false);

      await expect(service.evaluateArticle('article-1')).resolves.toEqual({
        isRelevant: true,
        reason: 'non-neutral sentiment with tickers',
      });

      expect(analysisFindOne).toHaveBeenCalledWith({
        where: { articleId: 'article-1' },
      });
      expect(notificationsExists).toHaveBeenCalledWith({
        where: { articleId: 'article-1' },
      });
    });
  });
});
