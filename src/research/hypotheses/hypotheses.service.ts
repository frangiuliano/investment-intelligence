import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { mapBriefStanceToBias } from './brief-stance-to-bias';
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
  /** Positive days; defaults to {@link DEFAULT_HYPOTHESIS_HORIZON_DAYS}. */
  horizonDays?: number;
  source?: string;
  sourceRefId?: string | null;
}

/** Default review horizon when the operator omits `horizonDays`. */
export const DEFAULT_HYPOTHESIS_HORIZON_DAYS = 30;

export interface CreateHypothesisFromBriefInput {
  briefId: string;
  symbol: string;
  stance: string;
  thesis: string;
  invalidation: string;
}

export interface CloseHypothesisInput {
  closeNote?: string | null;
}

@Injectable()
export class HypothesesService {
  private readonly logger = new Logger(HypothesesService.name);

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

  /**
   * Opens a journal hypothesis linked to a research brief with a validated
   * stance. Idempotent on `(source=brief, sourceRefId=briefId)`.
   */
  async createFromBrief(
    input: CreateHypothesisFromBriefInput,
  ): Promise<Hypothesis | null> {
    const bias = mapBriefStanceToBias(input.stance);
    if (!bias) {
      this.logger.warn(
        `Skipping hypothesis for brief ${input.briefId}: unknown stance "${input.stance}"`,
      );
      return null;
    }

    const existing = await this.findByBriefId(input.briefId);
    if (existing) {
      return existing;
    }

    try {
      return await this.create({
        symbol: input.symbol,
        bias,
        thesis: input.thesis,
        invalidation: input.invalidation,
        source: HypothesisSource.BRIEF,
        sourceRefId: input.briefId,
      });
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      const raced = await this.findByBriefId(input.briefId);
      if (raced) {
        return raced;
      }
      throw error;
    }
  }

  async findByBriefId(briefId: string): Promise<Hypothesis | null> {
    const sourceRefId = this.parseSourceRefId(briefId);
    if (!sourceRefId) {
      return null;
    }
    return this.hypothesesRepository.findOne({
      where: {
        source: HypothesisSource.BRIEF,
        sourceRefId,
      },
    });
  }

  async findAll(
    status?: string,
    source?: string,
    sourceRefId?: string,
  ): Promise<Hypothesis[]> {
    const where: {
      status?: HypothesisStatus;
      source?: HypothesisSource;
      sourceRefId?: string;
    } = {};

    const hasSourceRef =
      sourceRefId !== undefined &&
      sourceRefId !== null &&
      String(sourceRefId).trim() !== '';

    if (
      status !== undefined &&
      status !== null &&
      String(status).trim() !== ''
    ) {
      where.status = this.parseStatus(status);
    } else if (!hasSourceRef) {
      where.status = HypothesisStatus.OPEN;
    }

    if (
      source !== undefined &&
      source !== null &&
      String(source).trim() !== ''
    ) {
      where.source = this.parseSource(source);
    }

    if (hasSourceRef) {
      const parsedRef = this.parseSourceRefId(sourceRefId);
      if (!parsedRef) {
        throw new BadRequestException('sourceRefId must be a valid UUID');
      }
      where.sourceRefId = parsedRef;
    }

    return this.hypothesesRepository.find({
      where,
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

  private parseHorizonDays(horizonDays: number | undefined): number {
    if (horizonDays === undefined || horizonDays === null) {
      return DEFAULT_HYPOTHESIS_HORIZON_DAYS;
    }
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

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    typeof error.driverError === 'object' &&
    error.driverError !== null &&
    'code' in error.driverError &&
    (error.driverError as { code?: string }).code === '23505'
  );
}
