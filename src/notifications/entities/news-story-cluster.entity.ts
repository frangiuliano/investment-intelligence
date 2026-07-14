import {
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NewsStoryClusterMember } from './news-story-cluster-member.entity';

@Entity('news_story_clusters')
export class NewsStoryCluster {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToMany(() => NewsStoryClusterMember, (member) => member.cluster)
  members!: NewsStoryClusterMember[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
