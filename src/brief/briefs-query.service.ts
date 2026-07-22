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

export type BriefDetail = Omit<ResearchBrief, 'chartPng' | 'holding'> & {
  chartAvailable: boolean;
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

  async findBrief(id: string): Promise<BriefDetail> {
    const brief = await this.researchBriefsRepository.findOne({
      where: { id },
    });
    if (!brief) {
      throw new NotFoundException(`Brief ${id} not found`);
    }

    const chartAvailable = await this.researchBriefsRepository
      .createQueryBuilder('brief')
      .where('brief.id = :id', { id })
      .andWhere('brief.chart_png IS NOT NULL')
      .andWhere('octet_length(brief.chart_png) > 0')
      .getExists();

    return {
      id: brief.id,
      symbol: brief.symbol,
      locale: brief.locale,
      sections: brief.sections,
      promptVersion: brief.promptVersion,
      stance: brief.stance,
      stanceRationale: brief.stanceRationale,
      marketAsOf: brief.marketAsOf,
      marketSource: brief.marketSource,
      holdingId: brief.holdingId,
      createdAt: brief.createdAt,
      chartAvailable,
    };
  }

  async findBriefChartPng(id: string): Promise<Buffer> {
    const brief = await this.researchBriefsRepository
      .createQueryBuilder('brief')
      .select('brief.id')
      .addSelect('brief.chartPng')
      .where('brief.id = :id', { id })
      .getOne();

    if (!brief) {
      throw new NotFoundException(`Brief ${id} not found`);
    }
    if (!brief.chartPng || brief.chartPng.length === 0) {
      throw new NotFoundException(`Chart for brief ${id} not found`);
    }
    return brief.chartPng;
  }
}
