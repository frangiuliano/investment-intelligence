import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { NewsArticle } from '../news/entities/news-article.entity';
import { NewsAnalysis } from './entities/news-analysis.entity';
import { GEMINI_FLASH_MODEL } from './gemini.constants';
import { GeminiApiError, GeminiClient } from './gemini.client';
import { NewsAnalysisService } from './news-analysis.service';

describe('NewsAnalysisService', () => {
  let service: NewsAnalysisService;
  let geminiClient: { analyzeArticle: jest.Mock };
  let newsArticles: {
    createQueryBuilder: jest.Mock;
  };
  let newsAnalyses: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let queryBuilder: {
    leftJoin: jest.Mock;
    where: jest.Mock;
    orderBy: jest.Mock;
    take: jest.Mock;
    getMany: jest.Mock;
  };

  const articles: NewsArticle[] = [
    {
      id: 'article-1',
      title: 'First',
      url: 'https://news.example.com/1',
      content: 'Body one',
      source: 'Example',
      contentHash: 'hash-1',
      publishedAt: null,
      createdAt: new Date('2026-07-11T10:00:00.000Z'),
      updatedAt: new Date('2026-07-11T10:00:00.000Z'),
    },
    {
      id: 'article-2',
      title: 'Second',
      url: 'https://news.example.com/2',
      content: 'Body two',
      source: 'Example',
      contentHash: 'hash-2',
      publishedAt: null,
      createdAt: new Date('2026-07-11T10:01:00.000Z'),
      updatedAt: new Date('2026-07-11T10:01:00.000Z'),
    },
  ];

  beforeEach(async () => {
    jest.useFakeTimers();

    geminiClient = {
      analyzeArticle: jest.fn().mockResolvedValue({
        summary: 'Summary',
        sentiment: 'positive',
        tickers: ['AAPL'],
      }),
    };

    queryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(articles),
    };

    newsArticles = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    newsAnalyses = {
      create: jest.fn((value: Partial<NewsAnalysis>) => value),
      save: jest.fn().mockImplementation((value: Partial<NewsAnalysis>) =>
        Promise.resolve({
          id: 'analysis-1',
          ...value,
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsAnalysisService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === 'gemini.requestDelayMs') {
                return 1000;
              }
              if (key === 'gemini.analysisBatchSize') {
                return 5;
              }
              if (key === 'gemini.model') {
                return GEMINI_FLASH_MODEL;
              }
              throw new Error(`Unexpected config key: ${key}`);
            }),
          },
        },
        { provide: GeminiClient, useValue: geminiClient },
        {
          provide: getRepositoryToken(NewsArticle),
          useValue: newsArticles,
        },
        {
          provide: getRepositoryToken(NewsAnalysis),
          useValue: newsAnalyses,
        },
      ],
    }).compile();

    service = module.get(NewsAnalysisService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should analyze unanalyzed articles sequentially with configured delay', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const runPromise = service.analyzePending();
    await jest.runAllTimersAsync();
    const result = await runPromise;

    expect(queryBuilder.where).toHaveBeenCalledWith('analysis.id IS NULL');
    expect(queryBuilder.take).toHaveBeenCalledWith(5);
    expect(geminiClient.analyzeArticle).toHaveBeenCalledTimes(2);
    expect(
      geminiClient.analyzeArticle.mock.invocationCallOrder[0],
    ).toBeLessThan(geminiClient.analyzeArticle.mock.invocationCallOrder[1]);
    expect(
      setTimeoutSpy.mock.calls.some((call) => Number(call[1]) === 1000),
    ).toBe(true);
    expect(newsAnalyses.save).toHaveBeenCalledWith(
      expect.objectContaining({
        articleId: 'article-1',
        summary: 'Summary',
        sentiment: 'positive',
        tickers: ['AAPL'],
        model: GEMINI_FLASH_MODEL,
      }),
    );
    expect(result).toEqual({
      pending: 2,
      analyzed: 2,
      skipped: 0,
      errors: 0,
    });
  });

  it('should not re-analyze when unique constraint hits (already analyzed)', async () => {
    queryBuilder.getMany.mockResolvedValueOnce([articles[0]]);
    newsAnalyses.save.mockRejectedValueOnce(
      new QueryFailedError('INSERT', [], { code: '23505' }),
    );

    const runPromise = service.analyzePending();
    await jest.runAllTimersAsync();
    const result = await runPromise;

    expect(result).toEqual({
      pending: 1,
      analyzed: 0,
      skipped: 1,
      errors: 0,
    });
  });

  it('should retry on 429 then continue without crashing the run', async () => {
    queryBuilder.getMany.mockResolvedValueOnce([articles[0], articles[1]]);
    geminiClient.analyzeArticle
      .mockRejectedValueOnce(
        new GeminiApiError(
          'Gemini API 429: Please retry in 2s.',
          429,
          true,
          2000,
        ),
      )
      .mockResolvedValueOnce({
        summary: 'Recovered',
        sentiment: 'neutral',
        tickers: [],
      })
      .mockResolvedValueOnce({
        summary: 'Second ok',
        sentiment: 'positive',
        tickers: ['MSFT'],
      });

    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const runPromise = service.analyzePending();
    await jest.runAllTimersAsync();
    const result = await runPromise;

    expect(geminiClient.analyzeArticle).toHaveBeenCalledTimes(3);
    expect(
      setTimeoutSpy.mock.calls.some((call) => Number(call[1]) === 2000),
    ).toBe(true);
    expect(result).toEqual({
      pending: 2,
      analyzed: 2,
      skipped: 0,
      errors: 0,
    });
  });

  it('should count errors when Gemini keeps failing after retries', async () => {
    queryBuilder.getMany.mockResolvedValueOnce([articles[0]]);
    geminiClient.analyzeArticle.mockRejectedValue(
      new GeminiApiError('Gemini API 429: rate limited', 429, true),
    );

    const runPromise = service.analyzePending();
    await jest.runAllTimersAsync();
    const result = await runPromise;

    expect(geminiClient.analyzeArticle).toHaveBeenCalledTimes(4);
    expect(result.errors).toBe(1);
    expect(result.analyzed).toBe(0);
  });

  it('should not retry non-retryable Gemini parse errors', async () => {
    queryBuilder.getMany.mockResolvedValueOnce([articles[0]]);
    geminiClient.analyzeArticle.mockRejectedValue(
      new GeminiApiError(
        'Gemini response parse failed: bad schema',
        undefined,
        false,
      ),
    );

    const runPromise = service.analyzePending();
    await jest.runAllTimersAsync();
    const result = await runPromise;

    expect(geminiClient.analyzeArticle).toHaveBeenCalledTimes(1);
    expect(result.errors).toBe(1);
  });

  it('should defer exhausted failures so later articles can progress', async () => {
    queryBuilder.getMany
      .mockResolvedValueOnce([articles[0]])
      .mockResolvedValueOnce([articles[0], articles[1]]);
    geminiClient.analyzeArticle
      .mockRejectedValueOnce(new GeminiApiError('permanent', undefined, false))
      .mockResolvedValueOnce({
        summary: 'Second ok',
        sentiment: 'positive',
        tickers: ['MSFT'],
      });

    const firstPromise = service.analyzePending();
    await jest.runAllTimersAsync();
    const first = await firstPromise;

    expect(first).toEqual({
      pending: 1,
      analyzed: 0,
      skipped: 0,
      errors: 1,
    });

    const secondPromise = service.analyzePending();
    await jest.runAllTimersAsync();
    const second = await secondPromise;

    expect(queryBuilder.take).toHaveBeenLastCalledWith(6);
    expect(geminiClient.analyzeArticle).toHaveBeenCalledTimes(2);
    expect(geminiClient.analyzeArticle).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ title: 'Second' }),
    );
    expect(second).toEqual({
      pending: 1,
      analyzed: 1,
      skipped: 0,
      errors: 0,
    });
  });

  it('should reuse cached Gemini result when persist fails then succeeds', async () => {
    queryBuilder.getMany
      .mockResolvedValueOnce([articles[0]])
      .mockResolvedValueOnce([articles[0]]);
    newsAnalyses.save
      .mockRejectedValueOnce(new Error('connection reset'))
      .mockResolvedValueOnce({
        id: 'analysis-1',
        articleId: 'article-1',
      });

    const firstPromise = service.analyzePending();
    await jest.runAllTimersAsync();
    const first = await firstPromise;

    expect(first.errors).toBe(1);
    expect(geminiClient.analyzeArticle).toHaveBeenCalledTimes(1);

    const secondPromise = service.analyzePending();
    await jest.runAllTimersAsync();
    const second = await secondPromise;

    expect(geminiClient.analyzeArticle).toHaveBeenCalledTimes(1);
    expect(newsAnalyses.save).toHaveBeenCalledTimes(2);
    expect(second).toEqual({
      pending: 1,
      analyzed: 1,
      skipped: 0,
      errors: 0,
    });
  });
});
