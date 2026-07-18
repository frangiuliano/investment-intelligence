import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { NewsArticle } from './entities/news-article.entity';
import { NewsQueryService } from './news-query.service';

type QueryBuilderMock = {
  leftJoinAndSelect: jest.Mock;
  orderBy: jest.Mock;
  skip: jest.Mock;
  take: jest.Mock;
  andWhere: jest.Mock;
  getManyAndCount: jest.Mock;
};

function createQueryBuilderMock(): QueryBuilderMock {
  const qb: Partial<QueryBuilderMock> = {};
  qb.leftJoinAndSelect = jest.fn().mockReturnValue(qb);
  qb.orderBy = jest.fn().mockReturnValue(qb);
  qb.skip = jest.fn().mockReturnValue(qb);
  qb.take = jest.fn().mockReturnValue(qb);
  qb.andWhere = jest.fn().mockReturnValue(qb);
  qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
  return qb as QueryBuilderMock;
}

describe('NewsQueryService', () => {
  let service: NewsQueryService;
  let articlesQb: QueryBuilderMock;
  let analysesQb: QueryBuilderMock;
  let articleFindOne: jest.Mock;

  beforeEach(async () => {
    articlesQb = createQueryBuilderMock();
    analysesQb = createQueryBuilderMock();
    articleFindOne = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsQueryService,
        {
          provide: getRepositoryToken(NewsArticle),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(articlesQb),
            findOne: articleFindOne,
          },
        },
        {
          provide: getRepositoryToken(NewsAnalysis),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(analysesQb),
          },
        },
      ],
    }).compile();

    service = module.get(NewsQueryService);
  });

  describe('findArticles', () => {
    it('returns paginated articles with defaults', async () => {
      const items = [{ id: 'a1' }];
      articlesQb.getManyAndCount.mockResolvedValue([items, 1]);

      const result = await service.findArticles();

      expect(result).toEqual({ items, page: 1, limit: 20, total: 1 });
      expect(articlesQb.leftJoinAndSelect).toHaveBeenCalledWith(
        'article.analysis',
        'analysis',
      );
      expect(articlesQb.orderBy).toHaveBeenCalledWith(
        'article.createdAt',
        'DESC',
      );
      expect(articlesQb.skip).toHaveBeenCalledWith(0);
      expect(articlesQb.take).toHaveBeenCalledWith(20);
      expect(articlesQb.andWhere).not.toHaveBeenCalled();
    });

    it('applies pagination offsets', async () => {
      await service.findArticles({ page: 3, limit: 10 });

      expect(articlesQb.skip).toHaveBeenCalledWith(20);
      expect(articlesQb.take).toHaveBeenCalledWith(10);
    });

    it('filters by ticker (normalized to uppercase) via jsonb containment', async () => {
      await service.findArticles({ ticker: 'aapl' });

      expect(articlesQb.andWhere).toHaveBeenCalledWith(
        'analysis.tickers @> :tickers',
        { tickers: JSON.stringify(['AAPL']) },
      );
    });

    it('filters by date range with an inclusive date-only upper bound', async () => {
      await service.findArticles({
        from: '2026-01-01',
        to: '2026-01-31',
      });

      expect(articlesQb.andWhere).toHaveBeenCalledWith(
        'article.createdAt >= :from',
        { from: new Date('2026-01-01') },
      );
      expect(articlesQb.andWhere).toHaveBeenCalledWith(
        'article.createdAt <= :to',
        { to: new Date('2026-01-31T23:59:59.999Z') },
      );
    });

    it('includes records from the "to" day itself (date-only upper bound)', async () => {
      await service.findArticles({ to: '2026-07-31' });

      const [, params] = articlesQb.andWhere.mock.calls.find(
        ([clause]: [string]) => clause === 'article.createdAt <= :to',
      ) as [string, { to: Date }];

      const recordFromThatDay = new Date('2026-07-31T14:30:00.000Z');
      expect(recordFromThatDay.getTime()).toBeLessThanOrEqual(
        params.to.getTime(),
      );
    });

    it('keeps an explicit datetime "to" untouched', async () => {
      await service.findArticles({ to: '2026-01-31T12:00:00.000Z' });

      expect(articlesQb.andWhere).toHaveBeenCalledWith(
        'article.createdAt <= :to',
        { to: new Date('2026-01-31T12:00:00.000Z') },
      );
    });

    it('rejects invalid ticker', async () => {
      await expect(
        service.findArticles({ ticker: 'not a ticker!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid page and limit', async () => {
      await expect(service.findArticles({ page: 0 })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findArticles({ limit: 101 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects invalid date range', async () => {
      await expect(
        service.findArticles({ from: 'not-a-date' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.findArticles({ from: '2026-02-01', to: '2026-01-01' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findArticle', () => {
    it('returns the article with its analysis', async () => {
      const article = { id: 'a1', analysis: { id: 'an1' } };
      articleFindOne.mockResolvedValue(article);

      await expect(service.findArticle('a1')).resolves.toEqual(article);
      expect(articleFindOne).toHaveBeenCalledWith({
        where: { id: 'a1' },
        relations: { analysis: true },
      });
    });

    it('throws NotFound when the article does not exist', async () => {
      articleFindOne.mockResolvedValue(null);

      await expect(service.findArticle('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAnalyses', () => {
    it('returns paginated analyses ordered by analyzedAt', async () => {
      const items = [{ id: 'an1' }];
      analysesQb.getManyAndCount.mockResolvedValue([items, 1]);

      const result = await service.findAnalyses({ page: 2, limit: 5 });

      expect(result).toEqual({ items, page: 2, limit: 5, total: 1 });
      expect(analysesQb.orderBy).toHaveBeenCalledWith(
        'analysis.analyzedAt',
        'DESC',
      );
      expect(analysesQb.skip).toHaveBeenCalledWith(5);
      expect(analysesQb.take).toHaveBeenCalledWith(5);
    });

    it('filters analyses by ticker', async () => {
      await service.findAnalyses({ ticker: 'msft' });

      expect(analysesQb.andWhere).toHaveBeenCalledWith(
        'analysis.tickers @> :tickers',
        { tickers: JSON.stringify(['MSFT']) },
      );
    });
  });
});
