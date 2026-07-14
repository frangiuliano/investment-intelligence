import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DigestItem } from './digest-item.entity';

@Entity('digest_runs')
export class DigestRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  channel!: string;

  @Column({ name: 'item_count', type: 'int' })
  itemCount!: number;

  @Column({ name: 'lookback_hours', type: 'int' })
  lookbackHours!: number;

  @Column({ name: 'period_start', type: 'timestamptz' })
  periodStart!: Date;

  @Column({ name: 'period_end', type: 'timestamptz' })
  periodEnd!: Date;

  @OneToMany(() => DigestItem, (item) => item.digestRun)
  items!: DigestItem[];

  @CreateDateColumn({ name: 'sent_at', type: 'timestamptz' })
  sentAt!: Date;
}
