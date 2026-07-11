import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { NewsArticle } from './entities/news-article.entity';
import { NewsCollectorService } from './news-collector.service';
import { RssFeedClient } from './rss-feed.client';

describe('NewsCollectorService', () => {
  let service: NewsCollectorService;
  let rssFeedClient: { fetchFeed: jest.Mock };
  let newsArticles: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  const feedXmlItems = [
    {
      title: 'Market rally continues',
      link: 'https://news.example.com/rally',
      content: '<p>Stocks <b>rose</b> today.</p>',
      isoDate: '2026-07-11T12:00:00.000Z',
    },
    {
      title: 'Duplicate story',
      link: 'https://news.example.com/dup',
      contentSnippet: 'Same body',
    },
  ];

  beforeEach(async () => {
    rssFeedClient = {
      fetchFeed: jest.fn().mockResolvedValue({
        title: 'Example Finance',
        items: feedXmlItems,
      }),
    };

    newsArticles = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value: Partial<NewsArticle>) => value),
      save: jest.fn().mockImplementation((value: Partial<NewsArticle>) =>
        Promise.resolve({
          id: 'uuid-1',
          ...value,
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsCollectorService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === 'rss.feedUrls') {
                return ['https://feeds.example.com/rss'];
              }
              throw new Error(`Unexpected config key: ${key}`);
            }),
          },
        },
        { provide: RssFeedClient, useValue: rssFeedClient },
        {
          provide: getRepositoryToken(NewsArticle),
          useValue: newsArticles,
        },
      ],
    }).compile();

    service = module.get(NewsCollectorService);
  });

  it('should parse a mocked RSS feed and persist new articles', async () => {
    const result = await service.collect();

    expect(rssFeedClient.fetchFeed).toHaveBeenCalledWith(
      'https://feeds.example.com/rss',
    );
    expect(newsArticles.save).toHaveBeenCalledTimes(2);
    expect(newsArticles.save).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Market rally continues',
        url: 'https://news.example.com/rally',
        content: 'Stocks rose today.',
        source: 'Example Finance',
      }),
    );
    expect(result).toEqual({
      feedsProcessed: 1,
      itemsSeen: 2,
      inserted: 2,
      duplicates: 0,
      skipped: 0,
      errors: 0,
    });
  });

  it('should not insert duplicates when url or content hash already exists', async () => {
    newsArticles.findOne
      .mockResolvedValueOnce({ id: 'existing' })
      .mockResolvedValueOnce(null);
    newsArticles.save.mockRejectedValueOnce(
      new QueryFailedError('INSERT', [], { code: '23505' }),
    );

    const result = await service.collect();

    expect(result.duplicates).toBe(2);
    expect(result.inserted).toBe(0);
  });

  it('should use guid fallback and content snippet when link/content are blank', async () => {
    rssFeedClient.fetchFeed.mockResolvedValueOnce({
      title: 'Example Finance',
      items: [
        {
          title: 'Guid only',
          guid: 'https://news.example.com/guid-only',
          content: '',
          contentSnippet: 'From snippet',
        },
      ],
    });

    const result = await service.collect();

    expect(newsArticles.save).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Guid only',
        url: 'https://news.example.com/guid-only',
        content: 'From snippet',
      }),
    );
    expect(result.inserted).toBe(1);
    expect(result.skipped).toBe(0);
  });

  it('should count findOne failures as errors without aborting the run', async () => {
    newsArticles.findOne
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValueOnce(null);

    const result = await service.collect();

    expect(result.errors).toBe(1);
    expect(result.inserted).toBe(1);
    expect(result.itemsSeen).toBe(2);
  });

  it('should skip items without title or link and continue after feed errors', async () => {
    rssFeedClient.fetchFeed
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({
        title: 'Second Feed',
        items: [
          { title: 'No link' },
          {
            title: 'Valid',
            link: 'https://news.example.com/ok',
            content: 'Body',
          },
        ],
      });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsCollectorService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn(() => [
              'https://feeds.example.com/a',
              'https://feeds.example.com/b',
            ]),
          },
        },
        { provide: RssFeedClient, useValue: rssFeedClient },
        {
          provide: getRepositoryToken(NewsArticle),
          useValue: newsArticles,
        },
      ],
    }).compile();

    const multiFeedService = module.get(NewsCollectorService);
    const result = await multiFeedService.collect();

    expect(result.errors).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.inserted).toBe(1);
    expect(result.feedsProcessed).toBe(1);
  });
});
