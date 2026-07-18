import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsQueryService } from './notifications-query.service';

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

describe('NotificationsQueryService', () => {
  let service: NotificationsQueryService;
  let qb: QueryBuilderMock;
  let findOne: jest.Mock;

  beforeEach(async () => {
    qb = createQueryBuilderMock();
    findOne = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsQueryService,
        {
          provide: getRepositoryToken(Notification),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(qb),
            findOne,
          },
        },
      ],
    }).compile();

    service = module.get(NotificationsQueryService);
  });

  describe('findNotifications', () => {
    it('returns paginated notifications with defaults', async () => {
      const items = [{ id: 'n1' }];
      qb.getManyAndCount.mockResolvedValue([items, 1]);

      const result = await service.findNotifications();

      expect(result).toEqual({ items, page: 1, limit: 20, total: 1 });
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
        'notification.article',
        'article',
      );
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
        'article.analysis',
        'analysis',
      );
      expect(qb.orderBy).toHaveBeenCalledWith('notification.sentAt', 'DESC');
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('applies pagination offsets', async () => {
      await service.findNotifications({ page: 3, limit: 10 });

      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('filters by ticker (normalized to uppercase) via jsonb containment', async () => {
      await service.findNotifications({ ticker: 'aapl' });

      expect(qb.andWhere).toHaveBeenCalledWith('analysis.tickers @> :tickers', {
        tickers: JSON.stringify(['AAPL']),
      });
    });

    it('filters by date range with an inclusive date-only upper bound', async () => {
      await service.findNotifications({
        from: '2026-01-01',
        to: '2026-01-31',
      });

      expect(qb.andWhere).toHaveBeenCalledWith('notification.sentAt >= :from', {
        from: new Date('2026-01-01'),
      });
      expect(qb.andWhere).toHaveBeenCalledWith('notification.sentAt <= :to', {
        to: new Date('2026-01-31T23:59:59.999Z'),
      });
    });

    it('rejects invalid ticker', async () => {
      await expect(
        service.findNotifications({ ticker: 'not a ticker!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid page and limit', async () => {
      await expect(service.findNotifications({ page: 0 })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findNotifications({ limit: 101 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects invalid date range', async () => {
      await expect(
        service.findNotifications({ from: 'not-a-date' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.findNotifications({ from: '2026-02-01', to: '2026-01-01' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findNotification', () => {
    it('returns the notification with its article and analysis', async () => {
      const notification = {
        id: 'n1',
        article: { id: 'a1', analysis: { id: 'an1' } },
      };
      findOne.mockResolvedValue(notification);

      await expect(service.findNotification('n1')).resolves.toEqual(
        notification,
      );
      expect(findOne).toHaveBeenCalledWith({
        where: { id: 'n1' },
        relations: { article: { analysis: true } },
      });
    });

    it('throws NotFound when the notification does not exist', async () => {
      findOne.mockResolvedValue(null);

      await expect(service.findNotification('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
