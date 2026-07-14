import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NewsArticle } from '../../news/entities/news-article.entity';
import { NewsStoryCluster } from './news-story-cluster.entity';

@Entity('news_story_cluster_members')
export class NewsStoryClusterMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'cluster_id', type: 'uuid' })
  clusterId!: string;

  @ManyToOne(() => NewsStoryCluster, (cluster) => cluster.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cluster_id' })
  cluster!: NewsStoryCluster;

  @Column({ name: 'article_id', type: 'uuid', unique: true })
  articleId!: string;

  @ManyToOne(() => NewsArticle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_id' })
  article!: NewsArticle;

  @Column({ type: 'boolean', default: false })
  alerted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
