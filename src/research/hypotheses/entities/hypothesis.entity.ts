import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum HypothesisBias {
  BULLISH = 'bullish',
  BEARISH = 'bearish',
  WATCH = 'watch',
}

export enum HypothesisStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

export enum HypothesisSource {
  MANUAL = 'manual',
  BRIEF = 'brief',
  ALERT = 'alert',
}

@Entity('hypotheses')
export class Hypothesis {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32 })
  symbol!: string;

  @Column({ type: 'varchar', length: 16 })
  bias!: HypothesisBias;

  @Column({ type: 'text' })
  thesis!: string;

  @Column({ type: 'text' })
  invalidation!: string;

  @Column({ name: 'horizon_days', type: 'integer' })
  horizonDays!: number;

  @Column({
    type: 'varchar',
    length: 16,
    default: HypothesisStatus.OPEN,
  })
  status!: HypothesisStatus;

  @Column({
    type: 'varchar',
    length: 16,
    default: HypothesisSource.MANUAL,
  })
  source!: HypothesisSource;

  @Column({ name: 'source_ref_id', type: 'uuid', nullable: true })
  sourceRefId!: string | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt!: Date | null;

  @Column({ name: 'close_note', type: 'text', nullable: true })
  closeNote!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
