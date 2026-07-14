import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { WatchlistEntry } from './entities/watchlist-entry.entity';

export interface CreateWatchlistEntryInput {
  symbol: string;
  notes?: string | null;
}

export interface UpdateWatchlistEntryInput {
  symbol?: string;
  notes?: string | null;
}

@Injectable()
export class WatchlistService {
  constructor(
    @InjectRepository(WatchlistEntry)
    private readonly watchlistRepository: Repository<WatchlistEntry>,
  ) {}

  async create(input: CreateWatchlistEntryInput): Promise<WatchlistEntry> {
    const symbol = this.normalizeSymbol(input.symbol);
    const notes = this.normalizeNotes(input.notes);

    const existing = await this.watchlistRepository.findOne({
      where: { symbol, deletedAt: IsNull() },
    });
    if (existing) {
      throw new ConflictException(
        `Watchlist entry already exists for symbol=${symbol}`,
      );
    }

    const entry = this.watchlistRepository.create({ symbol, notes });
    return this.watchlistRepository.save(entry);
  }

  async findAll(): Promise<WatchlistEntry[]> {
    return this.watchlistRepository.find({
      order: { symbol: 'ASC' },
    });
  }

  async findOne(id: string): Promise<WatchlistEntry> {
    const entry = await this.watchlistRepository.findOne({ where: { id } });
    if (!entry) {
      throw new NotFoundException(`Watchlist entry ${id} not found`);
    }
    return entry;
  }

  async listActiveSymbols(): Promise<string[]> {
    const entries = await this.watchlistRepository.find({
      select: { symbol: true },
      order: { symbol: 'ASC' },
    });
    return entries.map((entry) => entry.symbol);
  }

  async update(
    id: string,
    input: UpdateWatchlistEntryInput,
  ): Promise<WatchlistEntry> {
    const entry = await this.findOne(id);

    if (input.symbol !== undefined) {
      entry.symbol = this.normalizeSymbol(input.symbol);
    }
    if (input.notes !== undefined) {
      entry.notes = this.normalizeNotes(input.notes);
    }

    const duplicate = await this.watchlistRepository.findOne({
      where: { symbol: entry.symbol, deletedAt: IsNull() },
    });
    if (duplicate && duplicate.id !== entry.id) {
      throw new ConflictException(
        `Watchlist entry already exists for symbol=${entry.symbol}`,
      );
    }

    return this.watchlistRepository.save(entry);
  }

  async softDelete(id: string): Promise<void> {
    const entry = await this.findOne(id);
    await this.watchlistRepository.softRemove(entry);
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
}
