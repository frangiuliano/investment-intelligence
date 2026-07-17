import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Holding } from '../../portfolio/holdings/entities/holding.entity';
import type { BriefSections, BriefStance } from '../brief.types';

@Entity('research_briefs')
export class ResearchBrief {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32 })
  symbol!: string;

  @Column({ type: 'varchar', length: 8 })
  locale!: string;

  @Column({ type: 'jsonb' })
  sections!: BriefSections;

  @Column({ name: 'prompt_version', type: 'varchar', length: 64 })
  promptVersion!: string;

  @Column({ type: 'varchar', length: 16, nullable: true })
  stance!: BriefStance | null;

  @Column({ name: 'stance_rationale', type: 'text', nullable: true })
  stanceRationale!: string | null;

  @Column({ name: 'market_as_of', type: 'timestamptz', nullable: true })
  marketAsOf!: Date | null;

  @Column({
    name: 'market_source',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  marketSource!: string | null;

  @Column({ name: 'holding_id', type: 'uuid', nullable: true })
  holdingId!: string | null;

  @ManyToOne(() => Holding, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'holding_id' })
  holding!: Holding | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
