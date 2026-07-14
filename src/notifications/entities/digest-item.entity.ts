import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { NewsArticle } from '../../news/entities/news-article.entity';
import { DigestRun } from './digest-run.entity';

@Entity('digest_items')
@Unique('UQ_digest_items_article_id', ['articleId'])
export class DigestItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'digest_run_id', type: 'uuid' })
  digestRunId!: string;

  @ManyToOne(() => DigestRun, (run) => run.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'digest_run_id' })
  digestRun!: DigestRun;

  @Column({ name: 'article_id', type: 'uuid' })
  articleId!: string;

  @ManyToOne(() => NewsArticle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_id' })
  article!: NewsArticle;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
