import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { MarketDataUnavailableError } from '../market-data/market-data.errors';
import { MarketDataService } from '../market-data/market-data.service';
import { MarketSeries } from '../market-data/market-data.types';
import { TelegramClient } from '../notifications/telegram.client';
import { HoldingsService } from '../portfolio/holdings/holdings.service';
import { BriefGeminiClient } from './brief-gemini.client';
import { BriefService } from './brief.service';
import { BriefGenerationResult, BriefSections } from './brief.types';
import { ResearchBrief } from './entities/research-brief.entity';

const sections: BriefSections = {
  overview: 'overview',
  fundamental: 'fundamental',
  technical: 'technical',
  risks: 'risks',
  invalidation: 'invalidation',
  disclaimer: 'disclaimer not advice',
};

const seriesFixture: MarketSeries = {
  symbol: 'AAPL',
  timeframe: '1d',
  asOf: '2026-07-17T15:00:00.000Z',
  source: 'yahoo-finance-chart',
  bars: [
    {
      time: '2026-01-02',
      open: 100,
      high: 105,
      low: 99,
      close: 102,
      volume: 1_000,
    },
    {
      time: '2026-07-16',
      open: 180,
      high: 185,
      low: 178,
      close: 182,
      volume: 2_000,
    },
  ],
};

describe('BriefService', () => {
  function createService(overrides?: {
    holdings?: Awaited<ReturnType<HoldingsService['findBySymbol']>>;
    generateBrief?: jest.Mock;
    getSeries?: jest.Mock;
    sendMessage?: jest.Mock;
    save?: jest.Mock;
  }) {
    const holdingsService = {
      findBySymbol: jest.fn().mockResolvedValue(overrides?.holdings ?? []),
    } as unknown as HoldingsService;

    const generateBrief =
      overrides?.generateBrief ??
      jest.fn().mockResolvedValue({
        sections,
        stance: 'watch',
        stanceRationale: 'Range-bound on verified closes',
      } satisfies BriefGenerationResult);
    const briefGeminiClient = {
      generateBrief,
    } as unknown as BriefGeminiClient;

    const getSeries =
      overrides?.getSeries ?? jest.fn().mockResolvedValue(seriesFixture);
    const marketDataService = {
      getSeries,
    } as unknown as MarketDataService;

    const sendMessage =
      overrides?.sendMessage ?? jest.fn().mockResolvedValue(undefined);
    const telegramClient = { sendMessage } as unknown as TelegramClient;

    const saved: ResearchBrief = {
      id: 'brief-1',
      symbol: 'AAPL',
      locale: 'en',
      sections,
      promptVersion: 'brief-v2',
      stance: 'watch',
      stanceRationale: 'Range-bound on verified closes',
      marketAsOf: new Date(seriesFixture.asOf),
      marketSource: seriesFixture.source,
      holdingId: null,
      holding: null,
      createdAt: new Date(),
    };

    const create = jest.fn((value: Partial<ResearchBrief>) => value);
    const save =
      overrides?.save ??
      jest.fn((value: ResearchBrief) =>
        Promise.resolve({ ...saved, ...value }),
      );
    const repository = {
      create,
      save,
    } as unknown as Repository<ResearchBrief>;

    const configService = {
      getOrThrow: (key: string) => {
        if (key === 'locale') {
          return 'en';
        }
        throw new Error(`unexpected config key ${key}`);
      },
    } as unknown as ConfigService;

    const service = new BriefService(
      configService,
      holdingsService,
      marketDataService,
      briefGeminiClient,
      telegramClient,
      repository,
    );

    return {
      service,
      holdingsService,
      generateBrief,
      getSeries,
      sendMessage,
      save,
    };
  }

  it('persists enter/avoid/watch stance without holding when market data is available', async () => {
    const generateBrief = jest.fn().mockResolvedValue({
      sections,
      stance: 'enter',
      stanceRationale: 'Uptrend on verified window closes',
    } satisfies BriefGenerationResult);
    const {
      service,
      generateBrief: generate,
      sendMessage,
      save,
      getSeries,
    } = createService({ generateBrief });

    const result = await service.requestBrief('aapl');

    expect(result.ok).toBe(true);
    expect(getSeries).toHaveBeenCalledWith('AAPL');
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'AAPL',
        holding: null,
      }),
    );
    const generateCalls = generate.mock.calls as Array<
      [{ marketFacts: string | null }]
    >;
    expect(generateCalls[0]?.[0].marketFacts).toContain('yahoo-finance-chart');
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'AAPL',
        stance: 'enter',
        stanceRationale: 'Uptrend on verified window closes',
        marketSource: 'yahoo-finance-chart',
        holdingId: null,
      }),
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('Research stance: Enter'),
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('Not a broker order'),
    );
  });

  it('persists position-relative stance when a holding exists', async () => {
    const generateBrief = jest.fn().mockResolvedValue({
      sections,
      stance: 'hold',
      stanceRationale: 'Position intact; no exit trigger on verified data',
    } satisfies BriefGenerationResult);
    const {
      service,
      generateBrief: generate,
      save,
      sendMessage,
    } = createService({
      holdings: [
        {
          id: 'holding-1',
          symbol: 'AAPL',
          assetType: 'equity',
          notes: 'core',
        } as never,
      ],
      generateBrief,
    });

    const result = await service.requestBrief('aapl');

    expect(result.ok).toBe(true);
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        holding: {
          symbol: 'AAPL',
          assetTypes: ['equity'],
          notes: 'core',
        },
      }),
    );
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        stance: 'hold',
        holdingId: 'holding-1',
      }),
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('Hold (research hypothesis)'),
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('relative to that position'),
    );
  });

  it('omits stance and does not invent prices when market data is unavailable', async () => {
    const generateBrief = jest.fn().mockResolvedValue({
      sections,
      stance: null,
      stanceRationale: null,
    } satisfies BriefGenerationResult);
    const getSeries = jest
      .fn()
      .mockRejectedValue(
        new MarketDataUnavailableError('AAPL', 'not_found', 'missing'),
      );
    const { service, save, sendMessage } = createService({
      generateBrief,
      getSeries,
    });

    const result = await service.requestBrief('AAPL');

    expect(result.ok).toBe(true);
    expect(generateBrief).toHaveBeenCalledWith(
      expect.objectContaining({
        marketFacts: null,
      }),
    );
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        stance: null,
        stanceRationale: null,
        marketAsOf: null,
        marketSource: null,
      }),
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('Stance was not issued'),
    );
  });

  it('persists educational brief with null stance when Gemini stance is invalid', async () => {
    const generateBrief = jest.fn().mockResolvedValue({
      sections,
      stance: null,
      stanceRationale: null,
    } satisfies BriefGenerationResult);
    const { service, save, sendMessage } = createService({ generateBrief });

    const result = await service.requestBrief('AAPL');

    expect(result.ok).toBe(true);
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        sections,
        stance: null,
        stanceRationale: null,
        marketSource: 'yahoo-finance-chart',
      }),
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('could not be validated'),
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('disclaimer not advice'),
    );
  });

  it('sends usage message for invalid tickers without calling Gemini', async () => {
    const { service, generateBrief, sendMessage, getSeries } = createService();

    const result = await service.requestBrief('!!!');

    expect(result.ok).toBe(false);
    expect(result.message).toContain('/brief TICKER');
    expect(generateBrief).not.toHaveBeenCalled();
    expect(getSeries).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('/brief TICKER'),
    );
  });

  it('sends busy message and rejects concurrent brief requests', async () => {
    const deferred: {
      resolve: ((value: BriefGenerationResult) => void) | null;
    } = { resolve: null };
    const generateBrief = jest.fn(
      () =>
        new Promise<BriefGenerationResult>((resolve) => {
          deferred.resolve = resolve;
        }),
    );
    const { service, sendMessage } = createService({ generateBrief });

    const firstPromise = service.requestBrief('AAPL');
    await Promise.resolve();
    const second = await service.requestBrief('MSFT');

    expect(second.ok).toBe(false);
    expect(second.message).toContain('already in progress');
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('already in progress'),
    );
    expect(deferred.resolve).not.toBeNull();

    deferred.resolve?.({
      sections,
      stance: 'watch',
      stanceRationale: 'wait',
    });
    const first = await firstPromise;
    expect(first.ok).toBe(true);
  });

  it('reports delivery failure when Telegram send fails after persist', async () => {
    const sendMessage = jest
      .fn()
      .mockRejectedValueOnce(new Error('telegram down'))
      .mockResolvedValue(undefined);
    const { service } = createService({ sendMessage });

    const result = await service.requestBrief('AAPL');

    expect(result.ok).toBe(false);
    expect(result.brief?.symbol).toBe('AAPL');
    expect(result.message).toContain('delivery failed');
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });
});
