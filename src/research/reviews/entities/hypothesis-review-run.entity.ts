import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { HypothesisReview } from './hypothesis-review.entity';

@Entity('hypothesis_review_runs')
export class HypothesisReviewRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'period_start', type: 'timestamptz' })
  periodStart!: Date;

  @Column({ name: 'period_end', type: 'timestamptz' })
  periodEnd!: Date;

  @Column({ name: 'reviewed_count', type: 'int' })
  reviewedCount!: number;

  @Column({ name: 'skipped_count', type: 'int', default: 0 })
  skippedCount!: number;

  @Column({ type: 'varchar', length: 8 })
  locale!: string;

  @Column({ name: 'summary_message', type: 'text', nullable: true })
  summaryMessage!: string | null;

  @OneToMany(() => HypothesisReview, (review) => review.reviewRun)
  reviews!: HypothesisReview[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
