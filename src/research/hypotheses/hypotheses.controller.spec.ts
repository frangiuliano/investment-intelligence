import { Test, TestingModule } from '@nestjs/testing';
import { HypothesesController } from './hypotheses.controller';
import { HypothesesService } from './hypotheses.service';

describe('HypothesesController', () => {
  let controller: HypothesesController;
  let findAll: jest.Mock;
  let create: jest.Mock;
  let close: jest.Mock;

  const sampleHypothesis = {
    id: '11111111-1111-4111-8111-111111111111',
    symbol: 'AAPL',
    bias: 'bullish',
    status: 'open',
  };

  beforeEach(async () => {
    findAll = jest.fn().mockResolvedValue([sampleHypothesis]);
    create = jest.fn().mockResolvedValue(sampleHypothesis);
    close = jest
      .fn()
      .mockResolvedValue({ ...sampleHypothesis, status: 'closed' });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HypothesesController],
      providers: [
        {
          provide: HypothesesService,
          useValue: { findAll, create, close },
        },
      ],
    }).compile();

    controller = module.get(HypothesesController);
  });

  it('should list hypotheses using the requested status', async () => {
    await expect(controller.list('open')).resolves.toEqual([sampleHypothesis]);
    expect(findAll).toHaveBeenCalledWith('open');
  });

  it('should create a hypothesis', async () => {
    const body = {
      symbol: 'AAPL',
      bias: 'bullish',
      thesis: 'Services growth supports margins.',
      invalidation: 'Services growth falls below 5%.',
      horizonDays: 90,
    };

    await expect(controller.create(body)).resolves.toEqual(sampleHypothesis);
    expect(create).toHaveBeenCalledWith(body);
  });

  it('should close a hypothesis', async () => {
    const body = { closeNote: 'Evidence changed.' };

    await expect(controller.close(sampleHypothesis.id, body)).resolves.toEqual({
      ...sampleHypothesis,
      status: 'closed',
    });
    expect(close).toHaveBeenCalledWith(sampleHypothesis.id, body);
  });
});
