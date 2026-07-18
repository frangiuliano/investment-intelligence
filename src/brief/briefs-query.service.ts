import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Paginated,
  parseLimit,
  parsePage,
  parseTicker,
} from '../common/list-query';
import { ResearchBrief } from './entities/research-brief.entity';

export type ListBriefsQuery = {
  page?: number;
  limit?: number;
  ticker?: string;
};

@Injectable()
export class BriefsQueryService {
  constructor(
    @InjectRepository(ResearchBrief)
    private readonly researchBriefsRepository: Repository<ResearchBrief>,
  ) {}

  async findBriefs(
    query: ListBriefsQuery = {},
  ): Promise<Paginated<ResearchBrief>> {
    const page = parsePage(query.page);
    const limit = parseLimit(query.limit);
    const ticker =
      query.ticker !== undefined ? parseTicker(query.ticker) : undefined;

    const qb = this.researchBriefsRepository
      .createQueryBuilder('brief')
      .orderBy('brief.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (ticker) {
      qb.andWhere('brief.symbol = :ticker', { ticker });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, page, limit, total };
  }

  async findBrief(id: string): Promise<ResearchBrief> {
    const brief = await this.researchBriefsRepository.findOne({
      where: { id },
    });
    if (!brief) {
      throw new NotFoundException(`Brief ${id} not found`);
    }
    return brief;
  }
}
