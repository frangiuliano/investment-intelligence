import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Holding, HoldingAssetType } from './entities/holding.entity';
import { HoldingsService } from './holdings.service';

describe('HoldingsService', () => {
  let service: HoldingsService;
  let findOne: jest.Mock;
  let find: jest.Mock;
  let create: jest.Mock;
  let save: jest.Mock;
  let softRemove: jest.Mock;

  beforeEach(async () => {
    findOne = jest.fn();
    find = jest.fn();
    create = jest.fn((entity: unknown) => entity);
    save = jest.fn((entity: Partial<Holding>) =>
      Promise.resolve({
        id: 'holding-1',
        createdAt: new Date('2026-07-13T12:00:00.000Z'),
        updatedAt: new Date('2026-07-13T12:00:00.000Z'),
        deletedAt: null,
        ...entity,
      } as Holding),
    );
    softRemove = jest.fn((entity: Holding) => Promise.resolve(entity));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HoldingsService,
        {
          provide: getRepositoryToken(Holding),
          useValue: { findOne, find, create, save, softRemove },
        },
      ],
    }).compile();

    service = module.get(HoldingsService);
  });

  it('should create a holding with normalized symbol and defaults', async () => {
    findOne.mockResolvedValue(null);

    const holding = await service.create({
      symbol: ' aapl ',
      assetType: HoldingAssetType.EQUITY,
      quantity: 10,
      notes: '  long-term thesis  ',
    });

    expect(create).toHaveBeenCalledWith({
      symbol: 'AAPL',
      assetType: HoldingAssetType.EQUITY,
      quantity: '10',
      currency: 'USD',
      avgEntryPrice: null,
      notes: 'long-term thesis',
    });
    expect(holding.symbol).toBe('AAPL');
    expect(holding.currency).toBe('USD');
  });

  it('should reject duplicate active holdings for the same symbol and type', async () => {
    findOne.mockResolvedValue({
      id: 'existing',
      symbol: 'AAPL',
      assetType: HoldingAssetType.EQUITY,
    });

    await expect(
      service.create({
        symbol: 'AAPL',
        assetType: HoldingAssetType.EQUITY,
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should reject invalid asset types and non-positive quantities', async () => {
    await expect(
      service.create({
        symbol: 'GGAL',
        assetType: 'crypto',
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.create({
        symbol: 'GGAL',
        assetType: HoldingAssetType.CEDEAR,
        quantity: 0,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should list and find holdings', async () => {
    const rows = [
      {
        id: 'holding-1',
        symbol: 'AAPL',
        assetType: HoldingAssetType.EQUITY,
      },
    ];
    find.mockResolvedValue(rows);
    findOne.mockResolvedValue(rows[0]);

    await expect(service.findAll()).resolves.toEqual(rows);
    await expect(service.findOne('holding-1')).resolves.toEqual(rows[0]);
    await expect(service.findBySymbol('aapl')).resolves.toEqual(rows);
    expect(find).toHaveBeenCalledWith({
      where: { symbol: 'AAPL' },
      order: { assetType: 'ASC' },
    });
  });

  it('should throw NotFoundException when holding is missing', async () => {
    findOne.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should update and soft-delete a holding', async () => {
    const existing = {
      id: 'holding-1',
      symbol: 'AAPL',
      assetType: HoldingAssetType.EQUITY,
      quantity: '10',
      currency: 'USD',
      avgEntryPrice: null,
      notes: null,
      deletedAt: null,
    };
    findOne
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existing);

    const updated = await service.update('holding-1', {
      quantity: '12.5',
      currency: 'ars',
      avgEntryPrice: 150,
    });

    expect(updated.quantity).toBe('12.5');
    expect(updated.currency).toBe('ARS');
    expect(updated.avgEntryPrice).toBe('150');

    await service.softDelete('holding-1');
    expect(softRemove).toHaveBeenCalledWith(existing);
  });
});
