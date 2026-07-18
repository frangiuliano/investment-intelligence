import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import {
  Paginated,
  parseIsoDate,
  parseIsoDateRangeEnd,
  parseLimit,
  parsePage,
} from '../common/list-query';
import { NewsArticle } from './entities/news-article.entity';

export type ListNewsQuery = {
  page?: number;
  limit?: number;
  ticker?: string;
  from?: string;
  to?: string;
};

const TICKER_PATTERN = /^[A-Z0-9.\-^]{1,12}$/;

@Injectable()
export class NewsQueryService {
  constructor(
    @InjectRepository(NewsArticle)
    private readonly articlesRepository: Repository<NewsArticle>,
    @InjectRepository(NewsAnalysis)
    private readonly analysesRepository: Repository<NewsAnalysis>,
  ) {}

  async findArticles(
    query: ListNewsQuery = {},
  ): Promise<Paginated<NewsArticle>> {
    const page = parsePage(query.page);
    const limit = parseLimit(query.limit);
    const { ticker, from, to } = this.parseFilters(query);

    const qb = this.articlesRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.analysis', 'analysis')
      .orderBy('article.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (ticker) {
      qb.andWhere('analysis.tickers @> :tickers', {
        tickers: JSON.stringify([ticker]),
      });
    }
    this.applyDateRange(qb, 'article.createdAt', from, to);

    const [items, total] = await qb.getManyAndCount();
    return { items, page, limit, total };
  }

  async findArticle(id: string): Promise<NewsArticle> {
    const article = await this.articlesRepository.findOne({
      where: { id },
      relations: { analysis: true },
    });
    if (!article) {
      throw new NotFoundException(`News article ${id} not found`);
    }
    return article;
  }

  async findAnalyses(
    query: ListNewsQuery = {},
  ): Promise<Paginated<NewsAnalysis>> {
    const page = parsePage(query.page);
    const limit = parseLimit(query.limit);
    const { ticker, from, to } = this.parseFilters(query);

    const qb = this.analysesRepository
      .createQueryBuilder('analysis')
      .orderBy('analysis.analyzedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (ticker) {
      qb.andWhere('analysis.tickers @> :tickers', {
        tickers: JSON.stringify([ticker]),
      });
    }
    this.applyDateRange(qb, 'analysis.analyzedAt', from, to);

    const [items, total] = await qb.getManyAndCount();
    return { items, page, limit, total };
  }

  private parseFilters(query: ListNewsQuery): {
    ticker?: string;
    from?: Date;
    to?: Date;
  } {
    let ticker: string | undefined;
    if (query.ticker !== undefined) {
      ticker = query.ticker.trim().toUpperCase();
      if (!TICKER_PATTERN.test(ticker)) {
        throw new BadRequestException(
          'ticker must be 1-12 chars (letters, digits, ".", "-", "^")',
        );
      }
    }

    const from = query.from ? parseIsoDate(query.from, 'from') : undefined;
    const to = query.to ? parseIsoDateRangeEnd(query.to, 'to') : undefined;
    if (from && to && to < from) {
      throw new BadRequestException('to must be >= from');
    }

    return { ticker, from, to };
  }

  private applyDateRange(
    qb: SelectQueryBuilder<NewsArticle> | SelectQueryBuilder<NewsAnalysis>,
    column: string,
    from?: Date,
    to?: Date,
  ): void {
    if (from) {
      qb.andWhere(`${column} >= :from`, { from });
    }
    if (to) {
      qb.andWhere(`${column} <= :to`, { to });
    }
  }
}
