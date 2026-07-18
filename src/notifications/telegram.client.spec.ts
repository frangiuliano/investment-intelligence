import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TELEGRAM_REQUEST_TIMEOUT_MS } from './telegram.constants';
import { TelegramApiError, TelegramClient } from './telegram.client';

describe('TelegramClient', () => {
  let client: TelegramClient;
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramClient,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === 'telegram.botToken') {
                return 'test-bot-token';
              }
              if (key === 'telegram.chatId') {
                return '123456789';
              }
              throw new Error(`Unexpected config key: ${key}`);
            }),
          },
        },
      ],
    }).compile();

    client = module.get(TelegramClient);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should call Telegram sendMessage with bot token and chat id', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });

    await client.sendMessage('hello');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.telegram.org/bottest-bot-token/sendMessage');
    expect(options.method).toBe('POST');
    expect(options.headers).toMatchObject({
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(options.body as string)).toEqual({
      chat_id: '123456789',
      text: 'hello',
      disable_web_page_preview: false,
    });
  });

  it('should throw a retryable TelegramApiError on HTTP 429', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Too Many Requests'),
    });

    await expect(client.sendMessage('hello')).rejects.toMatchObject({
      name: 'TelegramApiError',
      statusCode: 429,
      retryable: true,
    } satisfies Partial<TelegramApiError>);
  });

  it('should throw when Telegram returns ok:false', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: false, description: 'chat not found' }),
    });

    await expect(client.sendMessage('hello')).rejects.toThrow(/chat not found/);
  });

  it('should upload the photo as multipart form data with caption', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });

    await client.sendPhoto(Buffer.from('fake-png-bytes'), 'AAPL chart');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.telegram.org/bottest-bot-token/sendPhoto');
    expect(options.method).toBe('POST');
    const form = options.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(form.get('chat_id')).toBe('123456789');
    expect(form.get('caption')).toBe('AAPL chart');
    const photo = form.get('photo') as File;
    expect(photo.type).toBe('image/png');
    expect(photo.size).toBe(Buffer.from('fake-png-bytes').length);
  });

  it('should truncate photo captions above the Telegram limit', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });

    await client.sendPhoto(Buffer.from('png'), 'x'.repeat(2_000));

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const caption = (options.body as FormData).get('caption') as string;
    expect(caption.length).toBe(1_024);
    expect(caption.endsWith('…')).toBe(true);
  });

  it('should throw TelegramApiError when sendPhoto is rejected', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ ok: false, description: 'photo too large' }),
    });

    await expect(client.sendPhoto(Buffer.from('png'))).rejects.toThrow(
      /photo too large/,
    );
  });

  it('should throw a retryable error on timeout', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }),
    );

    const pending = client.sendMessage('hello');
    const expectation = expect(pending).rejects.toThrow(
      `Telegram request timed out after ${TELEGRAM_REQUEST_TIMEOUT_MS}ms`,
    );
    await jest.advanceTimersByTimeAsync(TELEGRAM_REQUEST_TIMEOUT_MS);
    await expectation;
  });
});
