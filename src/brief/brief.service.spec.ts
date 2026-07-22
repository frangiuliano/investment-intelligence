import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { TechnicalChartService } from '../charts/technical-chart.service';
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
    sendPhoto?: jest.Mock;
    save?: jest.Mock;
    update?: jest.Mock;
    chartEnabled?: boolean;
    renderTechnicalChart?: jest.Mock;
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
    const sendPhoto =
      overrides?.sendPhoto ?? jest.fn().mockResolvedValue(undefined);
    const telegramClient = {
      sendMessage,
      sendPhoto,
    } as unknown as TelegramClient;

    const renderTechnicalChart =
      overrides?.renderTechnicalChart ??
      jest.fn().mockReturnValue(Buffer.from('fake-png'));
    const technicalChartService = {
      isEnabled: jest.fn().mockReturnValue(overrides?.chartEnabled ?? true),
      renderTechnicalChart,
    } as unknown as TechnicalChartService;

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
    const update = overrides?.update ?? jest.fn().mockResolvedValue(undefined);
    const repository = {
      create,
      save,
      update,
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
      technicalChartService,
      telegramClient,
      repository,
    );

    return {
      service,
      holdingsService,
      generateBrief,
      getSeries,
      sendMessage,
      sendPhoto,
      renderTechnicalChart,
      save,
      update,
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

  it('sends the technical chart as a follow-up photo after the brief text', async () => {
    const { service, sendMessage, sendPhoto, renderTechnicalChart, update } =
      createService();

    const result = await service.requestBrief('AAPL');

    expect(result.ok).toBe(true);
    expect(renderTechnicalChart).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'AAPL', bars: seriesFixture.bars }),
    );
    expect(update).toHaveBeenCalledWith(
      'brief-1',
      expect.objectContaining({
        chartPng: expect.any(Buffer) as Buffer,
      }),
    );
    expect(sendPhoto).toHaveBeenCalledTimes(1);
    const [photo, caption] = sendPhoto.mock.calls[0] as [Buffer, string];
    expect(Buffer.isBuffer(photo)).toBe(true);
    expect(caption).toContain('AAPL');
    expect(caption).toContain('Not investment advice');
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it('skips the chart when market data is unavailable', async () => {
    const getSeries = jest
      .fn()
      .mockRejectedValue(
        new MarketDataUnavailableError('AAPL', 'not_found', 'missing'),
      );
    const { service, sendPhoto, renderTechnicalChart, update } = createService({
      getSeries,
    });

    const result = await service.requestBrief('AAPL');

    expect(result.ok).toBe(true);
    expect(renderTechnicalChart).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(sendPhoto).not.toHaveBeenCalled();
  });

  it('skips the chart when the feature is disabled', async () => {
    const { service, sendPhoto, renderTechnicalChart, update } = createService({
      chartEnabled: false,
    });

    const result = await service.requestBrief('AAPL');

    expect(result.ok).toBe(true);
    expect(renderTechnicalChart).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(sendPhoto).not.toHaveBeenCalled();
  });

  it('still delivers the brief and reports chart failure when render throws', async () => {
    const renderTechnicalChart = jest.fn(() => {
      throw new Error('render exploded');
    });
    const { service, sendMessage, sendPhoto, update } = createService({
      renderTechnicalChart,
    });

    const result = await service.requestBrief('AAPL');

    expect(result.ok).toBe(true);
    expect(update).not.toHaveBeenCalled();
    expect(sendPhoto).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith(expect.stringContaining('chart'));
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('Research stance'),
    );
  });

  it('persists the chart and reports failure when sendPhoto fails after render', async () => {
    const sendPhoto = jest.fn().mockRejectedValue(new Error('photo failed'));
    const { service, sendMessage, update } = createService({ sendPhoto });

    const result = await service.requestBrief('AAPL');

    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith(
      'brief-1',
      expect.objectContaining({
        chartPng: expect.any(Buffer) as Buffer,
      }),
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining(
        'the technical chart image could not be generated or sent',
      ),
    );
  });

  it('persists the chart even when Telegram text delivery fails after save', async () => {
    const sendMessage = jest
      .fn()
      .mockRejectedValueOnce(new Error('telegram down'))
      .mockResolvedValue(undefined);
    const { service, update, sendPhoto } = createService({ sendMessage });

    const result = await service.requestBrief('AAPL');

    expect(result.ok).toBe(false);
    expect(result.brief?.symbol).toBe('AAPL');
    expect(result.message).toContain('delivery failed');
    expect(update).toHaveBeenCalledWith(
      'brief-1',
      expect.objectContaining({
        chartPng: expect.any(Buffer) as Buffer,
      }),
    );
    expect(sendPhoto).toHaveBeenCalledTimes(1);
    // brief text (failed) + delivery-error notice
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  describe('requestBriefOrThrow', () => {
    it('returns the persisted brief on success', async () => {
      const { service } = createService();

      const brief = await service.requestBriefOrThrow('AAPL');

      expect(brief.symbol).toBe('AAPL');
      expect(brief.stance).toBe('watch');
    });

    it('returns the persisted brief when Telegram delivery fails after save', async () => {
      const sendMessage = jest
        .fn()
        .mockRejectedValueOnce(new Error('telegram down'))
        .mockResolvedValue(undefined);
      const { service } = createService({ sendMessage });

      const brief = await service.requestBriefOrThrow('AAPL');

      expect(brief.symbol).toBe('AAPL');
    });

    it('throws BadRequest when the ticker is invalid', async () => {
      const { service } = createService();

      await expect(service.requestBriefOrThrow('!!!')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws Conflict when a brief is already running', async () => {
      const deferred: {
        resolve: ((value: BriefGenerationResult) => void) | null;
      } = { resolve: null };
      const generateBrief = jest.fn(
        () =>
          new Promise<BriefGenerationResult>((resolve) => {
            deferred.resolve = resolve;
          }),
      );
      const { service } = createService({ generateBrief });

      const firstPromise = service.requestBrief('AAPL');
      await waitUntil(() => deferred.resolve !== null);

      await expect(service.requestBriefOrThrow('MSFT')).rejects.toThrow(
        ConflictException,
      );

      deferred.resolve?.({
        sections,
        stance: 'watch',
        stanceRationale: 'wait',
      });
      await firstPromise;
    });
  });
});

async function waitUntil(
  predicate: () => boolean,
  attempts = 50,
): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    if (predicate()) {
      return;
    }
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  throw new Error('waitUntil timed out');
}
