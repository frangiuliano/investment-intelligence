import { ConfigService } from '@nestjs/config';
import { BriefService } from '../brief/brief.service';
import { TelegramClient } from '../notifications/telegram.client';
import { CommandRouterService } from './command-router.service';

describe('CommandRouterService', () => {
  function createRouter(overrides?: {
    chatId?: string;
    locale?: string;
    allowedUserIds?: string[];
    requestBrief?: jest.Mock;
    sendMessage?: jest.Mock;
  }) {
    const requestBrief =
      overrides?.requestBrief ??
      jest.fn().mockResolvedValue({ ok: true, brief: null, message: 'ok' });
    const sendMessage =
      overrides?.sendMessage ?? jest.fn().mockResolvedValue(undefined);

    const router = new CommandRouterService(
      {
        getOrThrow: (key: string) => {
          if (key === 'telegram.chatId') {
            return overrides?.chatId ?? '111';
          }
          if (key === 'telegram.allowedUserIds') {
            return overrides?.allowedUserIds ?? [];
          }
          if (key === 'locale') {
            return overrides?.locale ?? 'en';
          }
          throw new Error(key);
        },
      } as unknown as ConfigService,
      { requestBrief } as unknown as BriefService,
      { sendMessage } as unknown as TelegramClient,
    );

    return { router, requestBrief, sendMessage };
  }

  it('routes /brief from the allowed private chat', async () => {
    const { router, requestBrief, sendMessage } = createRouter();

    await router.handleUpdate({
      message: { chat: { id: 111 }, from: { id: 42 }, text: '/brief AAPL' },
    });

    expect(requestBrief).toHaveBeenCalledWith('AAPL');
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('ignores updates from other chats', async () => {
    const { router, requestBrief, sendMessage } = createRouter();

    await router.handleUpdate({
      message: { chat: { id: 999 }, text: '/brief AAPL' },
    });

    expect(requestBrief).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('ignores group chats', async () => {
    const { router, requestBrief } = createRouter({ chatId: '-100123' });

    await router.handleUpdate({
      message: { chat: { id: -100123 }, text: '/brief AAPL' },
    });

    expect(requestBrief).not.toHaveBeenCalled();
  });

  it('rejects users outside TELEGRAM_ALLOWED_USER_IDS when configured', async () => {
    const { router, requestBrief } = createRouter({
      allowedUserIds: ['42'],
    });

    await router.handleUpdate({
      message: {
        chat: { id: 111 },
        from: { id: 99 },
        text: '/brief AAPL',
      },
    });

    expect(requestBrief).not.toHaveBeenCalled();
  });

  it('replies with usage when /brief has no ticker', async () => {
    const { router, requestBrief, sendMessage } = createRouter();

    await router.handleUpdate({
      message: { chat: { id: 111 }, text: '/brief' },
    });

    expect(requestBrief).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('/brief TICKER'),
    );
  });

  it('sends help for /help', async () => {
    const { router, sendMessage } = createRouter();

    await router.handleUpdate({
      message: { chat: { id: 111 }, text: '/help' },
    });

    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('/brief TICKER'),
    );
  });
});
