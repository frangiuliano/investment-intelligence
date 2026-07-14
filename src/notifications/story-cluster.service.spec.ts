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
  let getMany: jest.Mock;
  let membersFindOne: jest.Mock;
  let membersCreate: jest.Mock;
  let membersSave: jest.Mock;
  let clustersCreate: jest.Mock;
  let clustersSave: jest.Mock;

  beforeEach(async () => {
    where = jest.fn().mockReturnThis();
    andWhere = jest.fn().mockReturnThis();
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
              innerJoin: jest.fn().mockReturnThis(),
              where,
              andWhere,
              getMany,
            }),
          },
        },
      ],
    }).compile();

    service = module.get(StoryClusterService);
  });

  describe('findMatchingAlertedStory', () => {
    it('should prefilter by published_at/analyzed_at around the candidate reference', async () => {
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
        `(notification.payload->>'suppressed') IS DISTINCT FROM 'true'`,
      );
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
