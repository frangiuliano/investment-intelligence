import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import {
  FeedbackLabel,
  FeedbackTargetType,
} from './entities/operator-feedback.entity';

describe('FeedbackController', () => {
  const feedbackService = {
    create: jest.fn(),
  };

  const controller = new FeedbackController(
    feedbackService as unknown as FeedbackService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates feedback via the service', async () => {
    const body = {
      targetType: FeedbackTargetType.BRIEF,
      targetId: '22222222-2222-4222-8222-222222222222',
      label: FeedbackLabel.USEFUL,
    };
    feedbackService.create.mockResolvedValue({ id: 'fb1', ...body });

    await expect(controller.create(body)).resolves.toEqual({
      id: 'fb1',
      ...body,
    });
    expect(feedbackService.create).toHaveBeenCalledWith(body);
  });
});
