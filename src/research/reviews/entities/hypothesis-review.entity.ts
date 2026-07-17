import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Hypothesis } from '../../hypotheses/entities/hypothesis.entity';
import { HypothesisReviewRun } from './hypothesis-review-run.entity';

export enum HypothesisReviewOutcome {
  THESIS_CONFIRMED = 'thesis_confirmed',
  THESIS_REJECTED = 'thesis_rejected',
  TIMING_ISSUE = 'timing_issue',
  INCONCLUSIVE = 'inconclusive',
}

@Entity('hypothesis_reviews')
export class HypothesisReview {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'review_run_id', type: 'uuid' })
  reviewRunId!: string;

  @ManyToOne(() => HypothesisReviewRun, (run) => run.reviews, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'review_run_id' })
  reviewRun!: HypothesisReviewRun;

  @Column({ name: 'hypothesis_id', type: 'uuid' })
  hypothesisId!: string;

  @ManyToOne(() => Hypothesis, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hypothesis_id' })
  hypothesis!: Hypothesis;

  @Column({ type: 'varchar', length: 32 })
  outcome!: HypothesisReviewOutcome;

  @Column({ name: 'thesis_quality_note', type: 'text' })
  thesisQualityNote!: string;

  @Column({ name: 'timing_note', type: 'text' })
  timingNote!: string;

  @Column({ name: 'learning_note', type: 'text' })
  learningNote!: string;

  @Column({ type: 'text' })
  explanation!: string;

  @Column({
    name: 'price_return_pct',
    type: 'numeric',
    precision: 12,
    scale: 4,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) =>
        value === null || value === undefined ? null : Number(value),
    },
  })
  priceReturnPct!: number | null;

  @Column({
    name: 'price_start',
    type: 'numeric',
    precision: 18,
    scale: 6,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) =>
        value === null || value === undefined ? null : Number(value),
    },
  })
  priceStart!: number | null;

  @Column({
    name: 'price_end',
    type: 'numeric',
    precision: 18,
    scale: 6,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) =>
        value === null || value === undefined ? null : Number(value),
    },
  })
  priceEnd!: number | null;

  @Column({ name: 'price_as_of', type: 'timestamptz', nullable: true })
  priceAsOf!: Date | null;

  @Column({
    name: 'market_source',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  marketSource!: string | null;

  @Column({
    name: 'price_unavailable_reason',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  priceUnavailableReason!: string | null;

  @Column({ type: 'varchar', length: 8 })
  locale!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
