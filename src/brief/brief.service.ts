import {
  ConflictException,
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TechnicalChartService } from '../charts/technical-chart.service';
import { AppLocale } from '../config/env.validation';
import { MarketDataUnavailableError } from '../market-data/market-data.errors';
import { MarketDataService } from '../market-data/market-data.service';
import { TelegramClient } from '../notifications/telegram.client';
import { HoldingsService } from '../portfolio/holdings/holdings.service';
import { BRIEF_TICKER_PATTERN } from './brief.constants';
import { BriefGeminiClient } from './brief-gemini.client';
import { buildMarketFactsBlock } from './brief-market-facts';
import {
  formatBriefBusyMessage,
  formatBriefChartCaption,
  formatBriefChartUnavailableMessage,
  formatBriefDeliveryErrorMessage,
  formatBriefErrorMessage,
  formatBriefMessage,
  formatBriefUsageMessage,
} from './brief-message';
import { BRIEF_PROMPT_VERSION, sanitizeHoldingNotes } from './brief-prompt';
import { validateStanceForHolding } from './brief-stance';
import {
  BriefHoldingContext,
  BriefHoldingLookup,
  BriefMarketContext,
} from './brief.types';
import { ResearchBrief } from './entities/research-brief.entity';

export type BriefRequestResult = {
  brief: ResearchBrief | null;
  message: string;
  ok: boolean;
};

@Injectable()
export class BriefService {
  private readonly logger = new Logger(BriefService.name);
  private running = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly holdingsService: HoldingsService,
    private readonly marketDataService: MarketDataService,
    private readonly briefGeminiClient: BriefGeminiClient,
    private readonly technicalChartService: TechnicalChartService,
    private readonly telegramClient: TelegramClient,
    @InjectRepository(ResearchBrief)
    private readonly researchBriefsRepository: Repository<ResearchBrief>,
  ) {}

  async requestBrief(rawSymbol: string): Promise<BriefRequestResult> {
    const locale = this.configService.getOrThrow<AppLocale>('locale');

    let symbol: string;
    try {
      symbol = this.normalizeSymbol(rawSymbol);
    } catch {
      const message = formatBriefUsageMessage(locale);
      await this.safeSend(message);
      return { brief: null, message, ok: false };
    }

    if (this.running) {
      const message = formatBriefBusyMessage(locale);
      await this.safeSend(message);
      return { brief: null, message, ok: false };
    }

    this.running = true;
    let persistedBrief: ResearchBrief | null = null;
    try {
      const holdingLookup = await this.resolveHoldingContext(symbol);
      const holdingContext = this.toHoldingContext(holdingLookup);
      const market = await this.resolveMarketContext(symbol);
      const generated = await this.briefGeminiClient.generateBrief({
        symbol,
        holding: holdingContext,
        marketFacts: market?.factsBlock ?? null,
      });

      const stance = validateStanceForHolding(
        generated.stance,
        holdingContext !== null,
      );
      if (generated.stance && !stance) {
        this.logger.warn(
          `Discarding stance "${generated.stance}" for ${symbol} (holding=${holdingContext !== null})`,
        );
      }

      const stanceRationale = stance ? generated.stanceRationale : null;

      persistedBrief = await this.researchBriefsRepository.save(
        this.researchBriefsRepository.create({
          symbol,
          locale,
          sections: generated.sections,
          promptVersion: BRIEF_PROMPT_VERSION,
          knowledgeVersion: generated.knowledgeVersion,
          stance,
          stanceRationale,
          marketAsOf: market?.asOf ?? null,
          marketSource: market?.source ?? null,
          holdingId: holdingLookup?.holdingId ?? null,
        }),
      );

      const message = formatBriefMessage(
        {
          symbol,
          sections: generated.sections,
          holding: holdingContext,
          stance,
          stanceRationale,
          marketSource: market?.source ?? null,
          marketAsOf: market?.asOf ?? null,
        },
        locale,
      );

      let deliveryOk = true;
      try {
        await this.telegramClient.sendMessage(message);
      } catch (sendError) {
        deliveryOk = false;
        const detail =
          sendError instanceof Error ? sendError.message : String(sendError);
        this.logger.error(
          `Brief persisted for ${symbol} but Telegram delivery failed: ${detail}`,
        );
      }

      // Desk reuse (#76): persist chart even when the text message failed.
      await this.sendChartFollowUp(persistedBrief, market, locale);

      if (!deliveryOk) {
        const deliveryMessage = formatBriefDeliveryErrorMessage(locale);
        await this.safeSend(deliveryMessage);
        return {
          brief: persistedBrief,
          message: deliveryMessage,
          ok: false,
        };
      }

      return { brief: persistedBrief, message, ok: true };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error(`Brief request failed for ${symbol}: ${detail}`);
      const message = persistedBrief
        ? formatBriefDeliveryErrorMessage(locale)
        : formatBriefErrorMessage(locale);
      await this.safeSend(message);
      return { brief: persistedBrief, message, ok: false };
    } finally {
      this.running = false;
    }
  }

  /**
   * HTTP / one-shot: generate + persist (same pipeline as Telegram `/brief`).
   * Returns the persisted row when available — including when Telegram delivery
   * fails after save — so the dashboard can still read the brief.
   */
  async requestBriefOrThrow(rawSymbol: string): Promise<ResearchBrief> {
    if (this.running) {
      throw new ConflictException('A brief is already in progress');
    }

    const result = await this.requestBrief(rawSymbol);
    if (!result.brief) {
      throw new BadRequestException(result.message);
    }
    return result.brief;
  }

  /**
   * Chart errors are isolated on purpose (ADR 004): a render or sendPhoto
   * failure must never fail the already-persisted textual brief. One render
   * feeds both persistence and Telegram (#76). Called even when the brief
   * text message failed, so the desk can still read chart_png.
   */
  private async sendChartFollowUp(
    brief: ResearchBrief,
    market: BriefMarketContext | null,
    locale: AppLocale,
  ): Promise<void> {
    if (!market || !this.technicalChartService.isEnabled()) {
      return;
    }

    let chart: Buffer;
    try {
      chart = this.technicalChartService.renderTechnicalChart(market.series);
    } catch (chartError) {
      const detail =
        chartError instanceof Error ? chartError.message : String(chartError);
      this.logger.error(
        `Technical chart render failed for ${brief.symbol}: ${detail}`,
      );
      await this.safeSend(formatBriefChartUnavailableMessage(locale));
      return;
    }

    try {
      await this.researchBriefsRepository.update(brief.id, {
        chartPng: chart,
      });
    } catch (persistError) {
      const detail =
        persistError instanceof Error
          ? persistError.message
          : String(persistError);
      this.logger.error(
        `Technical chart persist failed for ${brief.symbol}: ${detail}`,
      );
    }

    try {
      await this.telegramClient.sendPhoto(
        chart,
        formatBriefChartCaption(brief.symbol, locale),
      );
    } catch (sendError) {
      const detail =
        sendError instanceof Error ? sendError.message : String(sendError);
      this.logger.error(
        `Technical chart sendPhoto failed for ${brief.symbol}: ${detail}`,
      );
      await this.safeSend(formatBriefChartUnavailableMessage(locale));
    }
  }

  private async resolveMarketContext(
    symbol: string,
  ): Promise<BriefMarketContext | null> {
    try {
      const series = await this.marketDataService.getSeries(symbol);
      return {
        factsBlock: buildMarketFactsBlock(series),
        asOf: new Date(series.asOf),
        source: series.source,
        series,
      };
    } catch (error) {
      if (!(error instanceof MarketDataUnavailableError)) {
        this.logger.warn(
          `Unexpected market data error for ${symbol}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      } else {
        this.logger.warn(
          `Market data unavailable for brief ${symbol}: ${error.reason}`,
        );
      }
      return null;
    }
  }

  private async safeSend(message: string): Promise<void> {
    try {
      await this.telegramClient.sendMessage(message);
    } catch (sendError) {
      const sendDetail =
        sendError instanceof Error ? sendError.message : String(sendError);
      this.logger.error(`Failed to send Telegram message: ${sendDetail}`);
    }
  }

  private normalizeSymbol(symbol: string): string {
    if (typeof symbol !== 'string' || symbol.trim() === '') {
      throw new BadRequestException('symbol is required');
    }
    const normalized = symbol.trim().toUpperCase();
    if (!BRIEF_TICKER_PATTERN.test(normalized)) {
      throw new BadRequestException('invalid ticker symbol');
    }
    return normalized;
  }

  private toHoldingContext(
    lookup: BriefHoldingLookup | null,
  ): BriefHoldingContext | null {
    if (!lookup) {
      return null;
    }
    return {
      symbol: lookup.symbol,
      assetTypes: lookup.assetTypes,
      notes: lookup.notes,
    };
  }

  private async resolveHoldingContext(
    symbol: string,
  ): Promise<BriefHoldingLookup | null> {
    const holdings = await this.holdingsService.findBySymbol(symbol);
    if (holdings.length === 0) {
      return null;
    }

    const assetTypes = [
      ...new Set(holdings.map((holding) => holding.assetType)),
    ];
    const notes = sanitizeHoldingNotes(
      holdings.map((holding) => holding.notes).find((note) => note) ?? null,
    );

    return {
      symbol,
      assetTypes,
      notes,
      holdingId: holdings[0].id,
    };
  }
}
