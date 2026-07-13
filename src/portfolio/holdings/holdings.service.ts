import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Holding, HoldingAssetType } from './entities/holding.entity';

const ASSET_TYPES = new Set<string>(Object.values(HoldingAssetType));

export interface CreateHoldingInput {
  symbol: string;
  assetType: string;
  quantity: number | string;
  currency?: string;
  avgEntryPrice?: number | string | null;
  notes?: string | null;
}

export interface UpdateHoldingInput {
  symbol?: string;
  assetType?: string;
  quantity?: number | string;
  currency?: string;
  avgEntryPrice?: number | string | null;
  notes?: string | null;
}

@Injectable()
export class HoldingsService {
  constructor(
    @InjectRepository(Holding)
    private readonly holdingsRepository: Repository<Holding>,
  ) {}

  async create(input: CreateHoldingInput): Promise<Holding> {
    const symbol = this.normalizeSymbol(input.symbol);
    const assetType = this.parseAssetType(input.assetType);
    const quantity = this.parsePositiveDecimal(input.quantity, 'quantity');
    const currency = this.normalizeCurrency(input.currency ?? 'USD');
    const avgEntryPrice =
      input.avgEntryPrice === undefined || input.avgEntryPrice === null
        ? null
        : this.parseNonNegativeDecimal(input.avgEntryPrice, 'avgEntryPrice');
    const notes = this.normalizeNotes(input.notes);

    const existing = await this.holdingsRepository.findOne({
      where: { symbol, assetType, deletedAt: IsNull() },
    });
    if (existing) {
      throw new ConflictException(
        `Holding already exists for symbol=${symbol} assetType=${assetType}`,
      );
    }

    const holding = this.holdingsRepository.create({
      symbol,
      assetType,
      quantity,
      currency,
      avgEntryPrice,
      notes,
    });

    return this.holdingsRepository.save(holding);
  }

  async findAll(): Promise<Holding[]> {
    return this.holdingsRepository.find({
      order: { symbol: 'ASC', assetType: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Holding> {
    const holding = await this.holdingsRepository.findOne({ where: { id } });
    if (!holding) {
      throw new NotFoundException(`Holding ${id} not found`);
    }
    return holding;
  }

  async findBySymbol(symbol: string): Promise<Holding[]> {
    const normalized = this.normalizeSymbol(symbol);
    return this.holdingsRepository.find({
      where: { symbol: normalized },
      order: { assetType: 'ASC' },
    });
  }

  async update(id: string, input: UpdateHoldingInput): Promise<Holding> {
    const holding = await this.findOne(id);

    if (input.symbol !== undefined) {
      holding.symbol = this.normalizeSymbol(input.symbol);
    }
    if (input.assetType !== undefined) {
      holding.assetType = this.parseAssetType(input.assetType);
    }
    if (input.quantity !== undefined) {
      holding.quantity = this.parsePositiveDecimal(input.quantity, 'quantity');
    }
    if (input.currency !== undefined) {
      holding.currency = this.normalizeCurrency(input.currency);
    }
    if (input.avgEntryPrice !== undefined) {
      holding.avgEntryPrice =
        input.avgEntryPrice === null
          ? null
          : this.parseNonNegativeDecimal(input.avgEntryPrice, 'avgEntryPrice');
    }
    if (input.notes !== undefined) {
      holding.notes = this.normalizeNotes(input.notes);
    }

    const duplicate = await this.holdingsRepository.findOne({
      where: {
        symbol: holding.symbol,
        assetType: holding.assetType,
        deletedAt: IsNull(),
      },
    });
    if (duplicate && duplicate.id !== holding.id) {
      throw new ConflictException(
        `Holding already exists for symbol=${holding.symbol} assetType=${holding.assetType}`,
      );
    }

    return this.holdingsRepository.save(holding);
  }

  async softDelete(id: string): Promise<void> {
    const holding = await this.findOne(id);
    await this.holdingsRepository.softRemove(holding);
  }

  private normalizeSymbol(symbol: string): string {
    if (typeof symbol !== 'string' || symbol.trim() === '') {
      throw new BadRequestException('symbol is required');
    }
    const normalized = symbol.trim().toUpperCase();
    if (normalized.length > 32) {
      throw new BadRequestException('symbol must be at most 32 characters');
    }
    return normalized;
  }

  private parseAssetType(assetType: string): HoldingAssetType {
    if (typeof assetType !== 'string' || !ASSET_TYPES.has(assetType)) {
      throw new BadRequestException(
        `assetType must be one of: ${[...ASSET_TYPES].join(', ')}`,
      );
    }
    return assetType as HoldingAssetType;
  }

  private normalizeCurrency(currency: string): string {
    if (typeof currency !== 'string' || currency.trim() === '') {
      throw new BadRequestException('currency is required');
    }
    const normalized = currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalized)) {
      throw new BadRequestException('currency must be a 3-letter ISO code');
    }
    return normalized;
  }

  private normalizeNotes(notes: string | null | undefined): string | null {
    if (notes === undefined || notes === null) {
      return null;
    }
    if (typeof notes !== 'string') {
      throw new BadRequestException('notes must be a string');
    }
    const trimmed = notes.trim();
    return trimmed === '' ? null : trimmed;
  }

  private parsePositiveDecimal(value: number | string, field: string): string {
    const parsed = this.parseDecimal(value, field);
    if (Number(parsed) <= 0) {
      throw new BadRequestException(`${field} must be greater than 0`);
    }
    return parsed;
  }

  private parseNonNegativeDecimal(
    value: number | string,
    field: string,
  ): string {
    const parsed = this.parseDecimal(value, field);
    if (Number(parsed) < 0) {
      throw new BadRequestException(
        `${field} must be greater than or equal to 0`,
      );
    }
    return parsed;
  }

  private parseDecimal(value: number | string, field: string): string {
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new BadRequestException(`${field} must be a finite number`);
      }
      return value.toString();
    }
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${field} is required`);
    }
    const trimmed = value.trim();
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
      throw new BadRequestException(`${field} must be a valid decimal number`);
    }
    return trimmed;
  }
}
