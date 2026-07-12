import { Test, TestingModule } from '@nestjs/testing';
import { PipelineStatusService } from './pipeline-status.service';
import { StatusController } from './status.controller';

describe('StatusController', () => {
  let controller: StatusController;
  let getStatus: jest.Mock;

  beforeEach(async () => {
    getStatus = jest.fn().mockResolvedValue({
      articles: 5,
      analyzed: 4,
      notified: 1,
      lastPipelineRunAt: '2026-07-12T20:00:00.000Z',
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatusController],
      providers: [
        {
          provide: PipelineStatusService,
          useValue: { getStatus },
        },
      ],
    }).compile();

    controller = module.get(StatusController);
  });

  it('should return pipeline status for GET /status', async () => {
    const status = await controller.getStatus();

    expect(getStatus).toHaveBeenCalledTimes(1);
    expect(status).toEqual({
      articles: 5,
      analyzed: 4,
      notified: 1,
      lastPipelineRunAt: '2026-07-12T20:00:00.000Z',
    });
  });
});
