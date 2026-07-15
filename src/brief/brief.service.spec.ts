import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { TelegramClient } from '../notifications/telegram.client';
import { HoldingsService } from '../portfolio/holdings/holdings.service';
import { BriefGeminiClient } from './brief-gemini.client';
import { BriefService } from './brief.service';
import { ResearchBrief } from './entities/research-brief.entity';
import { BriefSections } from './brief.types';

const sections: BriefSections = {
  overview: 'overview',
  fundamental: 'fundamental',
  technical: 'technical',
  risks: 'risks',
  invalidation: 'invalidation',
  disclaimer: 'disclaimer not advice',
};

describe('BriefService', () => {
  function createService(overrides?: {
    holdings?: Awaited<ReturnType<HoldingsService['findBySymbol']>>;
    generateBrief?: jest.Mock;
    sendMessage?: jest.Mock;
    save?: jest.Mock;
  }) {
    const holdingsService = {
      findBySymbol: jest.fn().mockResolvedValue(overrides?.holdings ?? []),
    } as unknown as HoldingsService;

    const generateBrief =
      overrides?.generateBrief ?? jest.fn().mockResolvedValue(sections);
    const briefGeminiClient = {
      generateBrief,
    } as unknown as BriefGeminiClient;

    const sendMessage =
      overrides?.sendMessage ?? jest.fn().mockResolvedValue(undefined);
    const telegramClient = { sendMessage } as unknown as TelegramClient;

    const saved: ResearchBrief = {
      id: 'brief-1',
      symbol: 'AAPL',
      locale: 'en',
      sections,
      promptVersion: 'brief-v1',
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
      briefGeminiClient,
      telegramClient,
      repository,
    );

    return {
      service,
      holdingsService,
      generateBrief,
      sendMessage,
      save,
    };
  }

  it('generates, persists, and sends a brief with holding context', async () => {
    const { service, generateBrief, sendMessage, save } = createService({
      holdings: [
        {
          id: 'holding-1',
          symbol: 'AAPL',
          assetType: 'equity',
          notes: 'core',
        } as never,
      ],
    });

    const result = await service.requestBrief('aapl');

    expect(result.ok).toBe(true);
    expect(result.brief?.symbol).toBe('AAPL');
    expect(generateBrief).toHaveBeenCalledWith({
      symbol: 'AAPL',
      holding: {
        symbol: 'AAPL',
        assetTypes: ['equity'],
        notes: 'core',
      },
    });
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'AAPL',
        holdingId: 'holding-1',
      }),
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('Educational research brief: AAPL'),
    );
    const sentCalls = sendMessage.mock.calls as string[][];
    expect(sentCalls[0]?.[0]).toContain('not a sell or reduce instruction');
  });

  it('sends usage message for invalid tickers without calling Gemini', async () => {
    const { service, generateBrief, sendMessage } = createService();

    const result = await service.requestBrief('!!!');

    expect(result.ok).toBe(false);
    expect(result.message).toContain('/brief TICKER');
    expect(generateBrief).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('/brief TICKER'),
    );
  });

  it('sends busy message and rejects concurrent brief requests', async () => {
    const deferred: {
      resolve: ((value: BriefSections) => void) | null;
    } = { resolve: null };
    const generateBrief = jest.fn(
      () =>
        new Promise<BriefSections>((resolve) => {
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

    deferred.resolve?.(sections);
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
