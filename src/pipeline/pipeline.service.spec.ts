import { Test, TestingModule } from '@nestjs/testing';
import { NewsAnalysisService } from '../analysis/news-analysis.service';
import { NewsCollectorService } from '../news/news-collector.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RelevanceService } from '../relevance/relevance.service';
import { PipelineService } from './pipeline.service';

describe('PipelineService', () => {
  let service: PipelineService;
  let collect: jest.Mock;
  let analyzePending: jest.Mock;
  let evaluatePending: jest.Mock;
  let notifyRelevant: jest.Mock;

  beforeEach(async () => {
    collect = jest.fn().mockResolvedValue({
      feedsProcessed: 1,
      itemsSeen: 2,
      inserted: 1,
      duplicates: 1,
      skipped: 0,
      errors: 0,
    });
    analyzePending = jest.fn().mockResolvedValue({
      pending: 1,
      analyzed: 1,
      skipped: 0,
      errors: 0,
    });
    evaluatePending = jest.fn().mockResolvedValue({
      candidates: 1,
      relevant: 1,
      notRelevant: 0,
    });
    notifyRelevant = jest.fn().mockResolvedValue({
      candidates: 1,
      sent: 1,
      skipped: 0,
      errors: 0,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelineService,
        {
          provide: NewsCollectorService,
          useValue: { collect },
        },
        {
          provide: NewsAnalysisService,
          useValue: { analyzePending },
        },
        {
          provide: RelevanceService,
          useValue: { evaluatePending },
        },
        {
          provide: NotificationsService,
          useValue: { notifyRelevant },
        },
      ],
    }).compile();

    service = module.get(PipelineService);
  });

  it('should run all pipeline stages in sequence', async () => {
    const result = await service.run();

    expect(collect).toHaveBeenCalledTimes(1);
    expect(analyzePending).toHaveBeenCalledTimes(1);
    expect(evaluatePending).toHaveBeenCalledTimes(1);
    expect(notifyRelevant).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      collection: { inserted: 1 },
      analysis: { analyzed: 1 },
      relevance: { relevant: 1 },
      notifications: { sent: 1 },
    });
    expect(result?.finishedAt).toBeInstanceOf(Date);
    expect(service.getLastRunAt()).toEqual(result?.finishedAt);
  });

  it('should skip overlapping runs', async () => {
    let resolveCollect: () => void = () => undefined;
    collect.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCollect = () =>
            resolve({
              feedsProcessed: 0,
              itemsSeen: 0,
              inserted: 0,
              duplicates: 0,
              skipped: 0,
              errors: 0,
            });
        }),
    );

    const firstRun = service.run();
    const secondRun = await service.run();

    expect(secondRun).toBeNull();
    resolveCollect();
    await firstRun;
  });

  it('should catch stage failures and return null without throwing', async () => {
    analyzePending.mockRejectedValue(new Error('database unavailable'));

    await expect(service.run()).resolves.toBeNull();
    expect(evaluatePending).not.toHaveBeenCalled();
    expect(notifyRelevant).not.toHaveBeenCalled();
    expect(service.getLastRunAt()).toBeNull();
  });

  it('should allow a new run after a previous stage failure', async () => {
    analyzePending.mockRejectedValueOnce(new Error('transient'));

    await expect(service.run()).resolves.toBeNull();
    await expect(service.run()).resolves.toMatchObject({
      analysis: { analyzed: 1 },
    });
  });
});
