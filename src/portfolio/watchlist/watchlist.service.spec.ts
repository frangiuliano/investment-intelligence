import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WatchlistEntry } from './entities/watchlist-entry.entity';
import { WatchlistService } from './watchlist.service';

describe('WatchlistService', () => {
  let service: WatchlistService;
  let findOne: jest.Mock;
  let find: jest.Mock;
  let create: jest.Mock;
  let save: jest.Mock;
  let softRemove: jest.Mock;

  beforeEach(async () => {
    findOne = jest.fn();
    find = jest.fn();
    create = jest.fn((entity: unknown) => entity);
    save = jest.fn((entity: Partial<WatchlistEntry>) =>
      Promise.resolve({
        id: 'watch-1',
        createdAt: new Date('2026-07-13T12:00:00.000Z'),
        updatedAt: new Date('2026-07-13T12:00:00.000Z'),
        deletedAt: null,
        ...entity,
      } as WatchlistEntry),
    );
    softRemove = jest.fn((entity: WatchlistEntry) => Promise.resolve(entity));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WatchlistService,
        {
          provide: getRepositoryToken(WatchlistEntry),
          useValue: { findOne, find, create, save, softRemove },
        },
      ],
    }).compile();

    service = module.get(WatchlistService);
  });

  it('should create a watchlist entry with normalized symbol', async () => {
    findOne.mockResolvedValue(null);

    const entry = await service.create({
      symbol: ' aapl ',
      notes: '  follow earnings  ',
    });

    expect(create).toHaveBeenCalledWith({
      symbol: 'AAPL',
      notes: 'follow earnings',
    });
    expect(entry.symbol).toBe('AAPL');
  });

  it('should reject duplicate active symbols', async () => {
    findOne.mockResolvedValue({ id: 'existing', symbol: 'AAPL' });

    await expect(service.create({ symbol: 'AAPL' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('should reject empty symbols', async () => {
    await expect(service.create({ symbol: '  ' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('should list entries and active symbols', async () => {
    const rows = [{ id: 'watch-1', symbol: 'AAPL' }];
    find.mockResolvedValue(rows);
    findOne.mockResolvedValue(rows[0]);

    await expect(service.findAll()).resolves.toEqual(rows);
    await expect(service.findOne('watch-1')).resolves.toEqual(rows[0]);
    await expect(service.listActiveSymbols()).resolves.toEqual(['AAPL']);
    expect(find).toHaveBeenCalledWith({
      select: { symbol: true },
      order: { symbol: 'ASC' },
    });
  });

  it('should throw NotFoundException when entry is missing', async () => {
    findOne.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should update and soft-delete an entry', async () => {
    const existing = {
      id: 'watch-1',
      symbol: 'AAPL',
      notes: null,
      deletedAt: null,
    };
    findOne
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existing);

    const updated = await service.update('watch-1', {
      notes: 'catalyst watch',
    });
    expect(updated.notes).toBe('catalyst watch');

    await service.softDelete('watch-1');
    expect(softRemove).toHaveBeenCalledWith(existing);
  });
});
