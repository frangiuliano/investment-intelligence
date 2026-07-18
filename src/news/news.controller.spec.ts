import { NewsController } from './news.controller';
import { NewsQueryService } from './news-query.service';

describe('NewsController', () => {
  const newsQueryService = {
    findArticles: jest.fn(),
    findArticle: jest.fn(),
    findAnalyses: jest.fn(),
  };

  const controller = new NewsController(
    newsQueryService as unknown as NewsQueryService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists articles with parsed query params', async () => {
    newsQueryService.findArticles.mockResolvedValue({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
    });

    await controller.listArticles(
      '1',
      '20',
      'AAPL',
      '2026-01-01',
      '2026-01-31',
    );

    expect(newsQueryService.findArticles).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      ticker: 'AAPL',
      from: '2026-01-01',
      to: '2026-01-31',
    });
  });

  it('lists articles without filters', async () => {
    newsQueryService.findArticles.mockResolvedValue({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
    });

    await controller.listArticles();

    expect(newsQueryService.findArticles).toHaveBeenCalledWith({
      page: undefined,
      limit: undefined,
      ticker: undefined,
      from: undefined,
      to: undefined,
    });
  });

  it('returns article detail', async () => {
    newsQueryService.findArticle.mockResolvedValue({ id: 'a1' });

    await expect(controller.articleDetail('a1')).resolves.toEqual({
      id: 'a1',
    });
    expect(newsQueryService.findArticle).toHaveBeenCalledWith('a1');
  });

  it('lists analyses with parsed query params', async () => {
    newsQueryService.findAnalyses.mockResolvedValue({
      items: [],
      page: 2,
      limit: 50,
      total: 0,
    });

    await controller.listAnalyses('2', '50', 'MSFT');

    expect(newsQueryService.findAnalyses).toHaveBeenCalledWith({
      page: 2,
      limit: 50,
      ticker: 'MSFT',
      from: undefined,
      to: undefined,
    });
  });
});
