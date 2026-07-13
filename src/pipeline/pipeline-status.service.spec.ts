import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { NewsArticle } from '../news/entities/news-article.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { PipelineService } from './pipeline.service';
import { PipelineStatusService } from './pipeline-status.service';

describe('PipelineStatusService', () => {
  let service: PipelineStatusService;
  let countArticles: jest.Mock;
  let countAnalyses: jest.Mock;
  let countNotifications: jest.Mock;
  let getLastRunAt: jest.Mock;

  beforeEach(async () => {
    countArticles = jest.fn().mockResolvedValue(10);
    countAnalyses = jest.fn().mockResolvedValue(8);
    countNotifications = jest.fn().mockResolvedValue(2);
    getLastRunAt = jest
      .fn()
      .mockReturnValue(new Date('2026-07-12T20:00:00.000Z'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelineStatusService,
        {
          provide: PipelineService,
          useValue: { getLastRunAt },
        },
        {
          provide: getRepositoryToken(NewsArticle),
          useValue: { count: countArticles },
        },
        {
          provide: getRepositoryToken(NewsAnalysis),
          useValue: { count: countAnalyses },
        },
        {
          provide: getRepositoryToken(Notification),
          useValue: { count: countNotifications },
        },
      ],
    }).compile();

    service = module.get(PipelineStatusService);
  });

  it('should return pipeline metrics and last run timestamp', async () => {
    const status = await service.getStatus();

    expect(status).toEqual({
      articles: 10,
      analyzed: 8,
      notified: 2,
      lastPipelineRunAt: '2026-07-12T20:00:00.000Z',
    });
  });

  it('should return null lastPipelineRunAt when pipeline never ran', async () => {
    getLastRunAt.mockReturnValue(null);

    const status = await service.getStatus();

    expect(status.lastPipelineRunAt).toBeNull();
  });
});
