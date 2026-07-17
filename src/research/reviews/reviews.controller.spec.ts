import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

describe('ReviewsController', () => {
  const reviewsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    runPeriodReview: jest.fn(),
  };

  const controller = new ReviewsController(
    reviewsService as unknown as ReviewsService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists reviews with query params', async () => {
    reviewsService.findAll.mockResolvedValue({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
    });

    await controller.list('1', '20', 'hyp-id', '2026-01-01', '2026-01-31');

    expect(reviewsService.findAll).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      hypothesisId: 'hyp-id',
      from: '2026-01-01',
      to: '2026-01-31',
    });
  });

  it('returns review detail', async () => {
    reviewsService.findOne.mockResolvedValue({ id: 'r1' });
    await expect(controller.detail('r1')).resolves.toEqual({ id: 'r1' });
  });

  it('triggers a period review run', async () => {
    reviewsService.runPeriodReview.mockResolvedValue({ ok: true });
    await controller.run({ notify: false });
    expect(reviewsService.runPeriodReview).toHaveBeenCalledWith({
      notify: false,
    });
  });
});
