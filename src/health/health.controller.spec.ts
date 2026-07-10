import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { DatabaseHealth } from '../database/database.health';

describe('HealthController', () => {
  let controller: HealthController;
  let databaseHealth: { isUp: jest.Mock };

  const mockResponse = () => {
    const res: {
      status: jest.Mock;
      json: jest.Mock;
    } = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    return res;
  };

  beforeEach(async () => {
    databaseHealth = { isUp: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DatabaseHealth,
          useValue: databaseHealth,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should return 200 when app and database are up', async () => {
    databaseHealth.isUp.mockResolvedValue(true);
    const res = mockResponse();

    await controller.check(res as never);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      checks: { app: 'up', database: 'up' },
    });
  });

  it('should return 503 when database is down', async () => {
    databaseHealth.isUp.mockResolvedValue(false);
    const res = mockResponse();

    await controller.check(res as never);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      checks: { app: 'up', database: 'down' },
    });
  });
});
