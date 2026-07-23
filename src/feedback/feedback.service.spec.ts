import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { ResearchBrief } from '../brief/entities/research-brief.entity';
import { Notification } from '../notifications/entities/notification.entity';
import {
  FeedbackLabel,
  FeedbackSource,
  FeedbackTargetType,
  OperatorFeedback,
} from './entities/operator-feedback.entity';
import { FeedbackService } from './feedback.service';

describe('FeedbackService', () => {
  const feedbackRepo = {
    create: jest.fn((value: Partial<OperatorFeedback>) => value),
    save: jest.fn(),
  };
  const analysisRepo = { findOne: jest.fn() };
  const briefRepo = { findOne: jest.fn() };
  const notificationRepo = { findOne: jest.fn() };

  let service: FeedbackService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        FeedbackService,
        {
          provide: getRepositoryToken(OperatorFeedback),
          useValue: feedbackRepo,
        },
        { provide: getRepositoryToken(NewsAnalysis), useValue: analysisRepo },
        { provide: getRepositoryToken(ResearchBrief), useValue: briefRepo },
        {
          provide: getRepositoryToken(Notification),
          useValue: notificationRepo,
        },
      ],
    }).compile();

    service = moduleRef.get(FeedbackService);
  });

  const analysisId = '11111111-1111-4111-8111-111111111111';
  const briefId = '22222222-2222-4222-8222-222222222222';
  const notificationId = '33333333-3333-4333-8333-333333333333';

  it('persists useful feedback for an analysis with version snapshot', async () => {
    analysisRepo.findOne.mockResolvedValue({
      id: analysisId,
      promptVersion: 'news-analysis-v2',
      knowledgeVersion: '0.1.0',
    });
    feedbackRepo.save.mockImplementation((row: OperatorFeedback) =>
      Promise.resolve({
        ...row,
        id: '44444444-4444-4444-8444-444444444444',
        createdAt: new Date('2026-07-23T12:00:00.000Z'),
      }),
    );

    const result = await service.create({
      targetType: FeedbackTargetType.ANALYSIS,
      targetId: analysisId,
      label: FeedbackLabel.USEFUL,
    });

    expect(result).toEqual({
      id: '44444444-4444-4444-8444-444444444444',
      targetType: FeedbackTargetType.ANALYSIS,
      targetId: analysisId,
      label: FeedbackLabel.USEFUL,
      promptVersion: 'news-analysis-v2',
      knowledgeVersion: '0.1.0',
      source: FeedbackSource.DESK,
      actor: 'desk-operator',
      createdAt: new Date('2026-07-23T12:00:00.000Z'),
    });
    expect(feedbackRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: FeedbackTargetType.ANALYSIS,
        targetId: analysisId,
        label: FeedbackLabel.USEFUL,
        promptVersion: 'news-analysis-v2',
        knowledgeVersion: '0.1.0',
        source: FeedbackSource.DESK,
        actor: 'desk-operator',
      }),
    );
  });

  it('persists noise feedback for a brief', async () => {
    briefRepo.findOne.mockResolvedValue({
      id: briefId,
      promptVersion: 'brief-v3',
      knowledgeVersion: '0.1.0',
    });
    feedbackRepo.save.mockImplementation((row: OperatorFeedback) =>
      Promise.resolve({
        ...row,
        id: '55555555-5555-4555-8555-555555555555',
        createdAt: new Date('2026-07-23T12:01:00.000Z'),
      }),
    );

    const result = await service.create({
      targetType: FeedbackTargetType.BRIEF,
      targetId: briefId,
      label: FeedbackLabel.NOISE,
      actor: 'franco',
    });

    expect(result.label).toBe(FeedbackLabel.NOISE);
    expect(result.actor).toBe('franco');
    expect(result.promptVersion).toBe('brief-v3');
    expect(result.knowledgeVersion).toBe('0.1.0');
  });

  it('snapshots analysis versions when target is a notification', async () => {
    notificationRepo.findOne.mockResolvedValue({
      id: notificationId,
      article: {
        analysis: {
          promptVersion: 'news-analysis-v2',
          knowledgeVersion: '0.2.0',
        },
      },
    });
    feedbackRepo.save.mockImplementation((row: OperatorFeedback) =>
      Promise.resolve({
        ...row,
        id: '66666666-6666-4666-8666-666666666666',
        createdAt: new Date('2026-07-23T12:02:00.000Z'),
      }),
    );

    const result = await service.create({
      targetType: FeedbackTargetType.NOTIFICATION,
      targetId: notificationId,
      label: FeedbackLabel.USEFUL,
    });

    expect(result.promptVersion).toBe('news-analysis-v2');
    expect(result.knowledgeVersion).toBe('0.2.0');
  });

  it('rejects unknown target types', async () => {
    await expect(
      service.create({
        targetType: 'tweet' as FeedbackTargetType,
        targetId: analysisId,
        label: FeedbackLabel.USEFUL,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid labels', async () => {
    await expect(
      service.create({
        targetType: FeedbackTargetType.ANALYSIS,
        targetId: analysisId,
        label: 'meh' as FeedbackLabel,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid target ids', async () => {
    await expect(
      service.create({
        targetType: FeedbackTargetType.ANALYSIS,
        targetId: 'not-a-uuid',
        label: FeedbackLabel.USEFUL,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns 404 when analysis is missing', async () => {
    analysisRepo.findOne.mockResolvedValue(null);

    await expect(
      service.create({
        targetType: FeedbackTargetType.ANALYSIS,
        targetId: analysisId,
        label: FeedbackLabel.USEFUL,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns 404 when brief is missing', async () => {
    briefRepo.findOne.mockResolvedValue(null);

    await expect(
      service.create({
        targetType: FeedbackTargetType.BRIEF,
        targetId: briefId,
        label: FeedbackLabel.NOISE,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns 404 when notification is missing', async () => {
    notificationRepo.findOne.mockResolvedValue(null);

    await expect(
      service.create({
        targetType: FeedbackTargetType.NOTIFICATION,
        targetId: notificationId,
        label: FeedbackLabel.USEFUL,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
