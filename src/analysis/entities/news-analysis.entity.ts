import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NewsArticle } from '../../news/entities/news-article.entity';

@Entity('news_analysis')
export class NewsAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'article_id', type: 'uuid', unique: true })
  articleId!: string;

  @OneToOne(() => NewsArticle, (article) => article.analysis, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'article_id' })
  article!: NewsArticle;

  @Column({ type: 'text', default: '' })
  headline!: string;

  @Column({ type: 'text' })
  summary!: string;

  @Column({ type: 'varchar', length: 32 })
  sentiment!: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  tickers!: string[];

  @Column({ type: 'varchar', length: 32 })
  materiality!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 32 })
  eventType!: string;

  @Column({ type: 'varchar', length: 128 })
  model!: string;

  @CreateDateColumn({ name: 'analyzed_at', type: 'timestamptz' })
  analyzedAt!: Date;
}
