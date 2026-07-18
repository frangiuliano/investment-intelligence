import { NotificationsController } from './notifications.controller';
import { NotificationsQueryService } from './notifications-query.service';

describe('NotificationsController', () => {
  const notificationsQueryService = {
    findNotifications: jest.fn(),
    findNotification: jest.fn(),
  };

  const controller = new NotificationsController(
    notificationsQueryService as unknown as NotificationsQueryService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists notifications with parsed query params', async () => {
    notificationsQueryService.findNotifications.mockResolvedValue({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
    });

    await controller.listNotifications(
      '1',
      '20',
      'AAPL',
      '2026-01-01',
      '2026-01-31',
    );

    expect(notificationsQueryService.findNotifications).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      ticker: 'AAPL',
      from: '2026-01-01',
      to: '2026-01-31',
    });
  });

  it('lists notifications without filters', async () => {
    notificationsQueryService.findNotifications.mockResolvedValue({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
    });

    await controller.listNotifications();

    expect(notificationsQueryService.findNotifications).toHaveBeenCalledWith({
      page: undefined,
      limit: undefined,
      ticker: undefined,
      from: undefined,
      to: undefined,
    });
  });

  it('returns notification detail', async () => {
    notificationsQueryService.findNotification.mockResolvedValue({ id: 'n1' });

    await expect(controller.notificationDetail('n1')).resolves.toEqual({
      id: 'n1',
    });
    expect(notificationsQueryService.findNotification).toHaveBeenCalledWith(
      'n1',
    );
  });
});
