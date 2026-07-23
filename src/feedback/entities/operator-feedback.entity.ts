import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum FeedbackTargetType {
  ANALYSIS = 'analysis',
  BRIEF = 'brief',
  NOTIFICATION = 'notification',
}

export enum FeedbackLabel {
  USEFUL = 'useful',
  NOISE = 'noise',
}

export enum FeedbackSource {
  DESK = 'desk',
}

@Entity('operator_feedback')
export class OperatorFeedback {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'target_type', type: 'varchar', length: 32 })
  targetType!: FeedbackTargetType;

  @Column({ name: 'target_id', type: 'uuid' })
  targetId!: string;

  @Column({ type: 'varchar', length: 16 })
  label!: FeedbackLabel;

  @Column({
    name: 'prompt_version',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  promptVersion!: string | null;

  @Column({
    name: 'knowledge_version',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  knowledgeVersion!: string | null;

  @Column({ type: 'varchar', length: 16, default: FeedbackSource.DESK })
  source!: FeedbackSource;

  @Column({ type: 'varchar', length: 64, default: 'desk-operator' })
  actor!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
