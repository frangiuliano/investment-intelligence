import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NewsAnalysis } from '../analysis/entities/news-analysis.entity';
import { NewsStoryClusterMember } from './entities/news-story-cluster-member.entity';
import { NewsStoryCluster } from './entities/news-story-cluster.entity';
import { StoryClusterService } from './story-cluster.service';

describe('StoryClusterService', () => {
  let service: StoryClusterService;
  let where: jest.Mock;
  let andWhere: jest.Mock;
  let leftJoin: jest.Mock;
  let distinct: jest.Mock;
  let getMany: jest.Mock;
  let membersFindOne: jest.Mock;
  let membersCreate: jest.Mock;
  let membersSave: jest.Mock;
  let clustersCreate: jest.Mock;
  let clustersSave: jest.Mock;

  beforeEach(async () => {
    where = jest.fn().mockReturnThis();
    andWhere = jest.fn().mockReturnThis();
    leftJoin = jest.fn().mockReturnThis();
    distinct = jest.fn().mockReturnThis();
    getMany = jest.fn().mockResolvedValue([]);
    membersFindOne = jest.fn();
    membersCreate = jest.fn((value: unknown) => value);
    membersSave = jest.fn((value: unknown) => Promise.resolve(value));
    clustersCreate = jest.fn(() => ({}));
    clustersSave = jest.fn(() => Promise.resolve({ id: 'cluster-new' }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoryClusterService,
        {
          provide: getRepositoryToken(NewsStoryCluster),
          useValue: { create: clustersCreate, save: clustersSave },
        },
        {
          provide: getRepositoryToken(NewsStoryClusterMember),
          useValue: {
            findOne: membersFindOne,
            create: membersCreate,
            save: membersSave,
          },
        },
        {
          provide: getRepositoryToken(NewsAnalysis),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue({
              innerJoinAndSelect: jest.fn().mockReturnThis(),
              leftJoin,
              where,
              andWhere,
              distinct,
              getMany,
            }),
          },
        },
      ],
    }).compile();

    service = module.get(StoryClusterService);
  });

  describe('findMatchingAlertedStory', () => {
    it('should prefilter by published_at/analyzed_at and include alerted cluster members', async () => {
      const referenceAt = new Date('2026-07-14T12:00:00.000Z');

      await service.findMatchingAlertedStory(
        {
          articleId: 'a1',
          title: 'SpaceX IPO filing',
          summary: 'SpaceX filed confidential IPO paperwork.',
          tickers: ['TSLA'],
          eventType: 'ipo',
          referenceAt,
        },
        24,
      );

      expect(where).toHaveBeenCalledWith(
        'COALESCE(article.published_at, analysis.analyzed_at) BETWEEN :windowStart AND :windowEnd',
        {
          windowStart: new Date('2026-07-13T12:00:00.000Z'),
          windowEnd: new Date('2026-07-15T12:00:00.000Z'),
        },
      );
      expect(andWhere).toHaveBeenCalledWith(
        'analysis.article_id != :candidateArticleId',
        { candidateArticleId: 'a1' },
      );
      expect(andWhere).toHaveBeenCalledWith(
        `(member.id IS NOT NULL OR (
          notification.id IS NOT NULL
          AND (notification.payload->>'suppressed') IS DISTINCT FROM 'true'
        ))`,
      );
      expect(leftJoin).toHaveBeenCalledWith(
        NewsStoryClusterMember,
        'member',
        'member.article_id = article.id AND member.alerted = true',
      );
      expect(distinct).toHaveBeenCalledWith(true);
    });

    it('should match a sibling via alerted cluster member even without a notification row', async () => {
      const prior = {
        articleId: 'article-prior',
        summary: 'SpaceX filed confidential IPO paperwork.',
        tickers: ['TSLA'],
        eventType: 'ipo',
        analyzedAt: new Date('2026-07-14T11:00:00.000Z'),
        article: {
          id: 'article-prior',
          title: 'SpaceX IPO filing sparks listing chatter',
          publishedAt: new Date('2026-07-14T11:00:00.000Z'),
        },
      };
      getMany.mockResolvedValue([prior]);
      membersFindOne.mockResolvedValue({
        clusterId: 'cluster-prior',
        articleId: 'article-prior',
        alerted: true,
      });

      const match = await service.findMatchingAlertedStory(
        {
          articleId: 'article-2',
          title: 'SpaceX IPO filing points to listing later this year',
          summary: 'Reports say SpaceX filed confidential IPO paperwork.',
          tickers: ['TSLA'],
          eventType: 'ipo',
          referenceAt: new Date('2026-07-14T12:00:00.000Z'),
        },
        24,
      );

      expect(match).toEqual({
        clusterId: 'cluster-prior',
        matchedArticleId: 'article-prior',
      });
    });
  });

  describe('ensureClusterForAlertedArticle', () => {
    it('should reuse an existing membership instead of creating a new cluster', async () => {
      membersFindOne.mockResolvedValue({
        clusterId: 'cluster-existing',
        articleId: 'article-1',
        alerted: true,
      });

      await expect(
        service.ensureClusterForAlertedArticle('article-1'),
      ).resolves.toBe('cluster-existing');
      expect(clustersSave).not.toHaveBeenCalled();
    });

    it('should create a cluster when the article has no membership yet', async () => {
      membersFindOne.mockResolvedValue(null);

      await expect(
        service.ensureClusterForAlertedArticle('article-1'),
      ).resolves.toBe('cluster-new');
      expect(clustersSave).toHaveBeenCalled();
      expect(membersSave).toHaveBeenCalledWith(
        expect.objectContaining({
          clusterId: 'cluster-new',
          articleId: 'article-1',
          alerted: true,
        }),
      );
    });
  });

  describe('findAlertedClusterId', () => {
    it('should return the cluster id only for alerted members', async () => {
      membersFindOne.mockResolvedValue({
        clusterId: 'cluster-alerted',
        alerted: true,
      });

      await expect(service.findAlertedClusterId('article-1')).resolves.toBe(
        'cluster-alerted',
      );
      expect(membersFindOne).toHaveBeenCalledWith({
        where: { articleId: 'article-1', alerted: true },
      });
    });
  });
});
