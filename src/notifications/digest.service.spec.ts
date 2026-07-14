import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { RelevanceService } from '../relevance/relevance.service';
import { DigestService } from './digest.service';
import { DigestItem } from './entities/digest-item.entity';
import { DigestRun } from './entities/digest-run.entity';
import { TelegramClient } from './telegram.client';

describe('DigestService', () => {
  let service: DigestService;
  let telegramClient: { sendMessage: jest.Mock };
  let relevanceService: { resolveWatchlistTickers: jest.Mock };
  let newsAnalyses: {
    createQueryBuilder: jest.Mock;
  };
  let digestRuns: {
    manager: { transaction: jest.Mock };
  };

  const articleId = '11111111-1111-4111-8111-111111111111';

  beforeEach(async () => {
    telegramClient = { sendMessage: jest.fn().mockResolvedValue(undefined) };
    relevanceService = {
      resolveWatchlistTickers: jest.fn().mockResolvedValue([]),
    };
    newsAnalyses = {
      createQueryBuilder: jest.fn(),
    };
    digestRuns = {
      manager: {
        transaction: jest.fn((fn: (manager: unknown) => Promise<void>) =>
          fn({
            create: (_entity: unknown, data: unknown) => data,
            save: jest.fn((entityOrRows: unknown, maybeRows?: unknown) => {
              if (maybeRows !== undefined) {
                return Promise.resolve(maybeRows);
              }
              return Promise.resolve({
                id: 'run-1',
                ...(entityOrRows as object),
              });
            }),
          }),
        ),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DigestService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === 'locale') {
                return 'en';
              }
              throw new Error(`unexpected getOrThrow ${key}`);
            }),
            get: jest.fn((key: string) => {
              if (key === 'digest.lookbackHours') {
                return 24;
              }
              return undefined;
            }),
          },
        },
        { provide: TelegramClient, useValue: telegramClient },
        { provide: RelevanceService, useValue: relevanceService },
        {
          provide: getRepositoryToken(NewsAnalysis),
          useValue: newsAnalyses,
        },
        {
          provide: getRepositoryToken(DigestRun),
          useValue: digestRuns,
        },
        {
          provide: getRepositoryToken(DigestItem),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get(DigestService);
  });

  function mockCandidates(analyses: NewsAnalysis[]): void {
    const qb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(analyses),
    };
    newsAnalyses.createQueryBuilder.mockReturnValue(qb);
  }

  function analysisFixture(
    overrides: Partial<NewsAnalysis> & {
      article?: { title: string; url: string };
    } = {},
  ): NewsAnalysis {
    return {
      id: 'analysis-1',
      articleId,
      summary: 'Medium impact note.',
      sentiment: 'neutral',
      tickers: ['AAPL'],
      materiality: 'medium',
      eventType: 'none',
      model: 'test',
      analyzedAt: new Date(),
      article: {
        title: 'Apple note',
        url: 'https://news.example.com/aapl',
        ...overrides.article,
      },
      ...overrides,
    } as NewsAnalysis;
  }

  it('should skip without calling Telegram when there are no candidates', async () => {
    mockCandidates([]);

    const result = await service.sendDigest();

    expect(result).toEqual({
      candidates: 0,
      sent: 0,
      skipped: true,
      errors: 0,
    });
    expect(telegramClient.sendMessage).not.toHaveBeenCalled();
    expect(digestRuns.manager.transaction).not.toHaveBeenCalled();
  });

  it('should send one digest message and persist items', async () => {
    mockCandidates([analysisFixture()]);

    const result = await service.sendDigest();

    expect(result).toEqual({
      candidates: 1,
      sent: 1,
      skipped: false,
      errors: 0,
    });
    expect(telegramClient.sendMessage).toHaveBeenCalledTimes(1);
    const sentArgs = telegramClient.sendMessage.mock.calls[0] as [string];
    const message = sentArgs[0];
    expect(message).toContain('News digest (24h)');
    expect(message).toContain('Apple note');
    expect(digestRuns.manager.transaction).toHaveBeenCalledTimes(1);
  });

  it('should filter out candidates outside the operator universe', async () => {
    mockCandidates([analysisFixture()]);
    relevanceService.resolveWatchlistTickers.mockResolvedValue(['MSFT']);

    const result = await service.sendDigest();

    expect(result.skipped).toBe(true);
    expect(result.sent).toBe(0);
    expect(telegramClient.sendMessage).not.toHaveBeenCalled();
  });

  it('should not re-enter while a run is in progress', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const qb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockImplementation(async () => {
        await gate;
        return [analysisFixture()];
      }),
    };
    newsAnalyses.createQueryBuilder.mockReturnValue(qb);

    const first = service.sendDigest();
    const overlapping = await service.sendDigest();
    release();
    await first;

    expect(overlapping).toEqual({
      candidates: 0,
      sent: 0,
      skipped: true,
      errors: 0,
    });
  });
});
