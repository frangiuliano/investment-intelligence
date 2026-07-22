import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ResearchBrief } from './entities/research-brief.entity';
import { BriefsQueryService } from './briefs-query.service';

type QueryBuilderMock = {
  orderBy: jest.Mock;
  skip: jest.Mock;
  take: jest.Mock;
  andWhere: jest.Mock;
  where: jest.Mock;
  select: jest.Mock;
  addSelect: jest.Mock;
  getManyAndCount: jest.Mock;
  getExists: jest.Mock;
  getOne: jest.Mock;
};

function createQueryBuilderMock(): QueryBuilderMock {
  const qb: Partial<QueryBuilderMock> = {};
  qb.orderBy = jest.fn().mockReturnValue(qb);
  qb.skip = jest.fn().mockReturnValue(qb);
  qb.take = jest.fn().mockReturnValue(qb);
  qb.andWhere = jest.fn().mockReturnValue(qb);
  qb.where = jest.fn().mockReturnValue(qb);
  qb.select = jest.fn().mockReturnValue(qb);
  qb.addSelect = jest.fn().mockReturnValue(qb);
  qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
  qb.getExists = jest.fn().mockResolvedValue(false);
  qb.getOne = jest.fn().mockResolvedValue(null);
  return qb as QueryBuilderMock;
}

describe('BriefsQueryService', () => {
  let service: BriefsQueryService;
  let qb: QueryBuilderMock;
  let findOne: jest.Mock;
  let createQueryBuilder: jest.Mock;

  beforeEach(async () => {
    qb = createQueryBuilderMock();
    findOne = jest.fn();
    createQueryBuilder = jest.fn().mockReturnValue(qb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BriefsQueryService,
        {
          provide: getRepositoryToken(ResearchBrief),
          useValue: {
            createQueryBuilder,
            findOne,
          },
        },
      ],
    }).compile();

    service = module.get(BriefsQueryService);
  });

  describe('findBriefs', () => {
    it('returns paginated briefs with defaults', async () => {
      const items = [{ id: 'b1' }];
      qb.getManyAndCount.mockResolvedValue([items, 1]);

      const result = await service.findBriefs();

      expect(result).toEqual({ items, page: 1, limit: 20, total: 1 });
      expect(qb.orderBy).toHaveBeenCalledWith('brief.createdAt', 'DESC');
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('applies pagination offsets', async () => {
      await service.findBriefs({ page: 3, limit: 10 });

      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('filters by ticker normalized to uppercase', async () => {
      await service.findBriefs({ ticker: 'aapl' });

      expect(qb.andWhere).toHaveBeenCalledWith('brief.symbol = :ticker', {
        ticker: 'AAPL',
      });
    });

    it('rejects invalid ticker', async () => {
      await expect(
        service.findBriefs({ ticker: 'not a ticker!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid page and limit', async () => {
      await expect(service.findBriefs({ page: 0 })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findBriefs({ limit: 101 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findBrief', () => {
    it('returns the brief with chartAvailable flag', async () => {
      const brief = {
        id: 'b1',
        symbol: 'AAPL',
        locale: 'en',
        sections: {},
        promptVersion: 'brief-v2',
        stance: null,
        stanceRationale: null,
        marketAsOf: null,
        marketSource: null,
        holdingId: null,
        createdAt: new Date('2026-07-22T00:00:00.000Z'),
      };
      findOne.mockResolvedValue(brief);
      qb.getExists.mockResolvedValue(true);

      await expect(service.findBrief('b1')).resolves.toEqual({
        ...brief,
        chartAvailable: true,
      });
      expect(findOne).toHaveBeenCalledWith({ where: { id: 'b1' } });
      expect(qb.andWhere).toHaveBeenCalledWith('brief.chart_png IS NOT NULL');
      expect(qb.andWhere).toHaveBeenCalledWith(
        'octet_length(brief.chart_png) > 0',
      );
    });

    it('throws NotFound when the brief does not exist', async () => {
      findOne.mockResolvedValue(null);

      await expect(service.findBrief('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findBriefChartPng', () => {
    it('returns the PNG buffer when present', async () => {
      const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      qb.getOne.mockResolvedValue({ id: 'b1', chartPng: png });

      await expect(service.findBriefChartPng('b1')).resolves.toEqual(png);
      expect(qb.addSelect).toHaveBeenCalledWith('brief.chartPng');
    });

    it('throws NotFound when the brief does not exist', async () => {
      qb.getOne.mockResolvedValue(null);

      await expect(service.findBriefChartPng('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFound when the brief has no chart', async () => {
      qb.getOne.mockResolvedValue({ id: 'b1', chartPng: null });

      await expect(service.findBriefChartPng('b1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
