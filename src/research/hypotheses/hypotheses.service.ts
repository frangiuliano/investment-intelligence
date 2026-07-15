import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Hypothesis,
  HypothesisBias,
  HypothesisSource,
  HypothesisStatus,
} from './entities/hypothesis.entity';

const BIASES = new Set<string>(Object.values(HypothesisBias));
const SOURCES = new Set<string>(Object.values(HypothesisSource));
const STATUSES = new Set<string>(Object.values(HypothesisStatus));
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface CreateHypothesisInput {
  symbol: string;
  bias: string;
  thesis: string;
  invalidation: string;
  horizonDays: number;
  source?: string;
  sourceRefId?: string | null;
}

export interface CloseHypothesisInput {
  closeNote?: string | null;
}

@Injectable()
export class HypothesesService {
  constructor(
    @InjectRepository(Hypothesis)
    private readonly hypothesesRepository: Repository<Hypothesis>,
  ) {}

  async create(input: CreateHypothesisInput): Promise<Hypothesis> {
    const hypothesis = this.hypothesesRepository.create({
      symbol: this.normalizeSymbol(input.symbol),
      bias: this.parseBias(input.bias),
      thesis: this.normalizeRequiredText(input.thesis, 'thesis', 5000),
      invalidation: this.normalizeRequiredText(
        input.invalidation,
        'invalidation',
        5000,
      ),
      horizonDays: this.parseHorizonDays(input.horizonDays),
      status: HypothesisStatus.OPEN,
      source: this.parseSource(input.source ?? HypothesisSource.MANUAL),
      sourceRefId: this.parseSourceRefId(input.sourceRefId),
      closedAt: null,
      closeNote: null,
    });

    return this.hypothesesRepository.save(hypothesis);
  }

  async findAll(status?: string): Promise<Hypothesis[]> {
    const parsedStatus = this.parseStatus(status ?? HypothesisStatus.OPEN);
    return this.hypothesesRepository.find({
      where: { status: parsedStatus },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Hypothesis> {
    const hypothesis = await this.hypothesesRepository.findOne({
      where: { id },
    });
    if (!hypothesis) {
      throw new NotFoundException(`Hypothesis ${id} not found`);
    }
    return hypothesis;
  }

  async close(
    id: string,
    input: CloseHypothesisInput = {},
  ): Promise<Hypothesis> {
    const closeNote = this.normalizeOptionalText(
      input.closeNote,
      'closeNote',
      2000,
    );
    const result = await this.hypothesesRepository.update(
      { id, status: HypothesisStatus.OPEN },
      {
        status: HypothesisStatus.CLOSED,
        closedAt: new Date(),
        closeNote,
      },
    );

    if (result.affected === 0) {
      const existing = await this.hypothesesRepository.findOne({
        where: { id },
      });
      if (!existing) {
        throw new NotFoundException(`Hypothesis ${id} not found`);
      }
      throw new ConflictException(`Hypothesis ${id} is already closed`);
    }

    return this.findOne(id);
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

  private parseBias(bias: string): HypothesisBias {
    if (typeof bias !== 'string' || !BIASES.has(bias)) {
      throw new BadRequestException(
        `bias must be one of: ${[...BIASES].join(', ')}`,
      );
    }
    return bias as HypothesisBias;
  }

  private parseSource(source: string): HypothesisSource {
    if (typeof source !== 'string' || !SOURCES.has(source)) {
      throw new BadRequestException(
        `source must be one of: ${[...SOURCES].join(', ')}`,
      );
    }
    return source as HypothesisSource;
  }

  private parseStatus(status: string): HypothesisStatus {
    if (typeof status !== 'string' || !STATUSES.has(status)) {
      throw new BadRequestException(
        `status must be one of: ${[...STATUSES].join(', ')}`,
      );
    }
    return status as HypothesisStatus;
  }

  private parseHorizonDays(horizonDays: number): number {
    if (
      typeof horizonDays !== 'number' ||
      !Number.isInteger(horizonDays) ||
      horizonDays <= 0
    ) {
      throw new BadRequestException('horizonDays must be a positive integer');
    }
    return horizonDays;
  }

  private parseSourceRefId(
    sourceRefId: string | null | undefined,
  ): string | null {
    if (sourceRefId === undefined || sourceRefId === null) {
      return null;
    }
    if (typeof sourceRefId !== 'string' || !UUID_PATTERN.test(sourceRefId)) {
      throw new BadRequestException('sourceRefId must be a valid UUID');
    }
    return sourceRefId;
  }

  private normalizeRequiredText(
    value: string,
    field: string,
    maxLength: number,
  ): string {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${field} is required`);
    }
    const normalized = value.trim();
    if (normalized.length > maxLength) {
      throw new BadRequestException(
        `${field} must be at most ${maxLength} characters`,
      );
    }
    return normalized;
  }

  private normalizeOptionalText(
    value: string | null | undefined,
    field: string,
    maxLength: number,
  ): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} must be a string`);
    }
    const normalized = value.trim();
    if (normalized.length > maxLength) {
      throw new BadRequestException(
        `${field} must be at most ${maxLength} characters`,
      );
    }
    return normalized === '' ? null : normalized;
  }
}
