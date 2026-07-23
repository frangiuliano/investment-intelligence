import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { ResearchBrief } from '../brief/entities/research-brief.entity';
import { Notification } from '../notifications/entities/notification.entity';
import {
  FeedbackLabel,
  FeedbackSource,
  FeedbackTargetType,
  OperatorFeedback,
} from './entities/operator-feedback.entity';
import type { CreateFeedbackInput, FeedbackResponse } from './feedback.types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TARGET_TYPES = new Set<string>(Object.values(FeedbackTargetType));
const LABELS = new Set<string>(Object.values(FeedbackLabel));

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(OperatorFeedback)
    private readonly feedbackRepo: Repository<OperatorFeedback>,
    @InjectRepository(NewsAnalysis)
    private readonly analysisRepo: Repository<NewsAnalysis>,
    @InjectRepository(ResearchBrief)
    private readonly briefRepo: Repository<ResearchBrief>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async create(input: CreateFeedbackInput): Promise<FeedbackResponse> {
    const targetType = parseTargetType(input.targetType);
    const label = parseLabel(input.label);
    const targetId = parseUuid(input.targetId, 'targetId');
    const actor = parseActor(input.actor);

    const versions = await this.resolveVersions(targetType, targetId);

    const saved = await this.feedbackRepo.save(
      this.feedbackRepo.create({
        targetType,
        targetId,
        label,
        promptVersion: versions.promptVersion,
        knowledgeVersion: versions.knowledgeVersion,
        source: FeedbackSource.DESK,
        actor,
      }),
    );

    return toResponse(saved);
  }

  private async resolveVersions(
    targetType: FeedbackTargetType,
    targetId: string,
  ): Promise<{
    promptVersion: string | null;
    knowledgeVersion: string | null;
  }> {
    if (targetType === FeedbackTargetType.ANALYSIS) {
      const analysis = await this.analysisRepo.findOne({
        where: { id: targetId },
      });
      if (!analysis) {
        throw new NotFoundException(`Analysis ${targetId} not found`);
      }
      return {
        promptVersion: analysis.promptVersion,
        knowledgeVersion: analysis.knowledgeVersion,
      };
    }

    if (targetType === FeedbackTargetType.BRIEF) {
      const brief = await this.briefRepo.findOne({ where: { id: targetId } });
      if (!brief) {
        throw new NotFoundException(`Brief ${targetId} not found`);
      }
      return {
        promptVersion: brief.promptVersion,
        knowledgeVersion: brief.knowledgeVersion,
      };
    }

    const notification = await this.notificationRepo.findOne({
      where: { id: targetId },
      relations: { article: { analysis: true } },
    });
    if (!notification) {
      throw new NotFoundException(`Notification ${targetId} not found`);
    }

    const analysis = notification.article?.analysis;
    return {
      promptVersion: analysis?.promptVersion ?? null,
      knowledgeVersion: analysis?.knowledgeVersion ?? null,
    };
  }
}

function parseTargetType(value: unknown): FeedbackTargetType {
  if (typeof value !== 'string' || !TARGET_TYPES.has(value)) {
    throw new BadRequestException(
      `targetType must be one of: ${[...TARGET_TYPES].join(', ')}`,
    );
  }
  return value as FeedbackTargetType;
}

function parseLabel(value: unknown): FeedbackLabel {
  if (typeof value !== 'string' || !LABELS.has(value)) {
    throw new BadRequestException(
      `label must be one of: ${[...LABELS].join(', ')}`,
    );
  }
  return value as FeedbackLabel;
}

function parseUuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new BadRequestException(`${field} must be a valid UUID`);
  }
  return value;
}

function parseActor(value: unknown): string {
  if (value === undefined || value === null || value === '') {
    return 'desk-operator';
  }
  if (typeof value !== 'string') {
    throw new BadRequestException('actor must be a string');
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 64) {
    throw new BadRequestException('actor must be 1–64 characters');
  }
  return trimmed;
}

function toResponse(row: OperatorFeedback): FeedbackResponse {
  return {
    id: row.id,
    targetType: row.targetType,
    targetId: row.targetId,
    label: row.label,
    promptVersion: row.promptVersion,
    knowledgeVersion: row.knowledgeVersion,
    source: row.source,
    actor: row.actor,
    createdAt: row.createdAt,
  };
}
