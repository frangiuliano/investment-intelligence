import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Holding } from '../../portfolio/holdings/entities/holding.entity';
import type { BriefSections } from '../brief.types';

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

  @Column({ name: 'holding_id', type: 'uuid', nullable: true })
  holdingId!: string | null;

  @ManyToOne(() => Holding, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'holding_id' })
  holding!: Holding | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
