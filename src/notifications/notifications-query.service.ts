import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Paginated,
  parseDateRange,
  parseLimit,
  parsePage,
  parseTicker,
} from '../common/list-query';
import { Notification } from './entities/notification.entity';

export type ListNotificationsQuery = {
  page?: number;
  limit?: number;
  ticker?: string;
  from?: string;
  to?: string;
};

@Injectable()
export class NotificationsQueryService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  async findNotifications(
    query: ListNotificationsQuery = {},
  ): Promise<Paginated<Notification>> {
    const page = parsePage(query.page);
    const limit = parseLimit(query.limit);
    const ticker =
      query.ticker !== undefined ? parseTicker(query.ticker) : undefined;
    const { from, to } = parseDateRange(query.from, query.to);

    const qb = this.notificationsRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.article', 'article')
      .leftJoinAndSelect('article.analysis', 'analysis')
      .orderBy('notification.sentAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (ticker) {
      qb.andWhere('analysis.tickers @> :tickers', {
        tickers: JSON.stringify([ticker]),
      });
    }
    if (from) {
      qb.andWhere('notification.sentAt >= :from', { from });
    }
    if (to) {
      qb.andWhere('notification.sentAt <= :to', { to });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, page, limit, total };
  }

  async findNotification(id: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: { id },
      relations: { article: { analysis: true } },
    });
    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }
    return notification;
  }
}
