import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NewsAnalysis } from '../../analysis/entities/news-analysis.entity';
import { Notification } from '../../notifications/entities/notification.entity';

@Entity('news_articles')
export class NewsArticle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 500 })
  title!: string;

  @Column({ type: 'varchar', length: 2048, unique: true })
  url!: string;

  @Column({ type: 'text', nullable: true })
  content!: string | null;

  @Column({ type: 'varchar', length: 255 })
  source!: string;

  @Column({ name: 'content_hash', type: 'varchar', length: 64, unique: true })
  contentHash!: string;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToOne(() => NewsAnalysis, (analysis) => analysis.article)
  analysis?: NewsAnalysis;

  @OneToMany(() => Notification, (notification) => notification.article)
  notifications?: Notification[];
}
