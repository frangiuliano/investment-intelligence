import { Test, TestingModule } from '@nestjs/testing';
import { HoldingAssetType } from './entities/holding.entity';
import { HoldingsController } from './holdings.controller';
import { HoldingsService } from './holdings.service';

describe('HoldingsController', () => {
  let controller: HoldingsController;
  let findAll: jest.Mock;
  let findOne: jest.Mock;
  let create: jest.Mock;
  let update: jest.Mock;
  let softDelete: jest.Mock;

  const sampleHolding = {
    id: '11111111-1111-4111-8111-111111111111',
    symbol: 'AAPL',
    assetType: HoldingAssetType.EQUITY,
    quantity: '10',
    currency: 'USD',
    avgEntryPrice: null,
    notes: null,
  };

  beforeEach(async () => {
    findAll = jest.fn().mockResolvedValue([sampleHolding]);
    findOne = jest.fn().mockResolvedValue(sampleHolding);
    create = jest.fn().mockResolvedValue(sampleHolding);
    update = jest.fn().mockResolvedValue({ ...sampleHolding, quantity: '12' });
    softDelete = jest.fn().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HoldingsController],
      providers: [
        {
          provide: HoldingsService,
          useValue: { findAll, findOne, create, update, softDelete },
        },
      ],
    }).compile();

    controller = module.get(HoldingsController);
  });

  it('should list holdings', async () => {
    await expect(controller.list()).resolves.toEqual([sampleHolding]);
    expect(findAll).toHaveBeenCalledTimes(1);
  });

  it('should get one holding by id', async () => {
    await expect(controller.getOne(sampleHolding.id)).resolves.toEqual(
      sampleHolding,
    );
    expect(findOne).toHaveBeenCalledWith(sampleHolding.id);
  });

  it('should create a holding', async () => {
    const body = {
      symbol: 'AAPL',
      assetType: HoldingAssetType.EQUITY,
      quantity: 10,
    };
    await expect(controller.create(body)).resolves.toEqual(sampleHolding);
    expect(create).toHaveBeenCalledWith(body);
  });

  it('should update a holding', async () => {
    await expect(
      controller.update(sampleHolding.id, { quantity: 12 }),
    ).resolves.toEqual({ ...sampleHolding, quantity: '12' });
    expect(update).toHaveBeenCalledWith(sampleHolding.id, { quantity: 12 });
  });

  it('should soft-delete a holding', async () => {
    await expect(controller.remove(sampleHolding.id)).resolves.toBeUndefined();
    expect(softDelete).toHaveBeenCalledWith(sampleHolding.id);
  });
});
