import { Test, TestingModule } from '@nestjs/testing';
import { WatchlistController } from './watchlist.controller';
import { WatchlistService } from './watchlist.service';

describe('WatchlistController', () => {
  let controller: WatchlistController;
  let findAll: jest.Mock;
  let findOne: jest.Mock;
  let create: jest.Mock;
  let update: jest.Mock;
  let softDelete: jest.Mock;

  const sampleEntry = {
    id: '11111111-1111-4111-8111-111111111111',
    symbol: 'AAPL',
    notes: null,
  };

  beforeEach(async () => {
    findAll = jest.fn().mockResolvedValue([sampleEntry]);
    findOne = jest.fn().mockResolvedValue(sampleEntry);
    create = jest.fn().mockResolvedValue(sampleEntry);
    update = jest.fn().mockResolvedValue({ ...sampleEntry, notes: 'follow' });
    softDelete = jest.fn().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WatchlistController],
      providers: [
        {
          provide: WatchlistService,
          useValue: { findAll, findOne, create, update, softDelete },
        },
      ],
    }).compile();

    controller = module.get(WatchlistController);
  });

  it('should list watchlist entries', async () => {
    await expect(controller.list()).resolves.toEqual([sampleEntry]);
    expect(findAll).toHaveBeenCalledTimes(1);
  });

  it('should get one entry by id', async () => {
    await expect(controller.getOne(sampleEntry.id)).resolves.toEqual(
      sampleEntry,
    );
    expect(findOne).toHaveBeenCalledWith(sampleEntry.id);
  });

  it('should create an entry', async () => {
    const body = { symbol: 'AAPL', notes: 'follow' };
    await expect(controller.create(body)).resolves.toEqual(sampleEntry);
    expect(create).toHaveBeenCalledWith(body);
  });

  it('should update an entry', async () => {
    await expect(
      controller.update(sampleEntry.id, { notes: 'follow' }),
    ).resolves.toEqual({ ...sampleEntry, notes: 'follow' });
    expect(update).toHaveBeenCalledWith(sampleEntry.id, { notes: 'follow' });
  });

  it('should soft-delete an entry', async () => {
    await expect(controller.remove(sampleEntry.id)).resolves.toBeUndefined();
    expect(softDelete).toHaveBeenCalledWith(sampleEntry.id);
  });
});
