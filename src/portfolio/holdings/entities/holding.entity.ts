import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum HoldingAssetType {
  EQUITY = 'equity',
  CEDEAR = 'cedear',
  BOND = 'bond',
  TREASURY = 'treasury',
  OTHER = 'other',
}

@Entity('holdings')
export class Holding {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32 })
  symbol!: string;

  @Column({ name: 'asset_type', type: 'varchar', length: 32 })
  assetType!: HoldingAssetType;

  @Column({ type: 'decimal', precision: 28, scale: 10 })
  quantity!: string;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency!: string;

  @Column({
    name: 'avg_entry_price',
    type: 'decimal',
    precision: 28,
    scale: 10,
    nullable: true,
  })
  avgEntryPrice!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
