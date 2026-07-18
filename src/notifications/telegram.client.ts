import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TELEGRAM_MAX_CAPTION_LENGTH,
  TELEGRAM_REQUEST_TIMEOUT_MS,
} from './telegram.constants';

export class TelegramApiError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'TelegramApiError';
  }
}

@Injectable()
export class TelegramClient {
  constructor(private readonly configService: ConfigService) {}

  async sendMessage(text: string): Promise<void> {
    const chatId = this.configService.getOrThrow<string>('telegram.chatId');
    await this.postToBotApi('sendMessage', {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: false,
      }),
    });
  }

  async sendPhoto(photo: Buffer, caption?: string): Promise<void> {
    const chatId = this.configService.getOrThrow<string>('telegram.chatId');

    const form = new FormData();
    form.append('chat_id', chatId);
    form.append(
      'photo',
      new Blob([new Uint8Array(photo)], { type: 'image/png' }),
      'chart.png',
    );
    if (caption) {
      form.append('caption', truncateCaption(caption));
    }

    await this.postToBotApi('sendPhoto', { body: form });
  }

  private async postToBotApi(
    method: 'sendMessage' | 'sendPhoto',
    request: { headers?: Record<string, string>; body: BodyInit },
  ): Promise<void> {
    const botToken = this.configService.getOrThrow<string>('telegram.botToken');
    const url = `https://api.telegram.org/bot${botToken}/${method}`;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      TELEGRAM_REQUEST_TIMEOUT_MS,
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: request.headers,
        body: request.body,
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await safeReadBody(response, controller.signal);
        const retryable = response.status === 429 || response.status >= 500;
        throw new TelegramApiError(
          `Telegram API ${response.status}: ${truncateLogBody(body)}`,
          response.status,
          retryable,
        );
      }

      const data = await readWithAbort(
        response.json() as Promise<{ ok?: boolean; description?: string }>,
        controller.signal,
      );

      if (!data.ok) {
        throw new TelegramApiError(
          `Telegram API rejected ${method}: ${truncateLogBody(data.description ?? 'unknown error')}`,
          undefined,
          false,
        );
      }
    } catch (error) {
      if (error instanceof TelegramApiError) {
        throw error;
      }
      if (isAbortError(error)) {
        throw new TelegramApiError(
          `Telegram request timed out after ${TELEGRAM_REQUEST_TIMEOUT_MS}ms`,
          undefined,
          true,
        );
      }
      throw new TelegramApiError(
        `Telegram request failed: ${errorMessage(error)}`,
        undefined,
        true,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function safeReadBody(
  response: Response,
  signal: AbortSignal,
): Promise<string> {
  try {
    return await readWithAbort(response.text(), signal);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    return '(unreadable body)';
  }
}

function readWithAbort<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(createAbortError());
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      reject(createAbortError());
    };

    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

function createAbortError(): Error {
  if (typeof DOMException === 'function') {
    return new DOMException('This operation was aborted', 'AbortError');
  }
  const error = new Error('This operation was aborted');
  error.name = 'AbortError';
  return error;
}

function truncateCaption(caption: string): string {
  if (caption.length <= TELEGRAM_MAX_CAPTION_LENGTH) {
    return caption;
  }
  return `${caption.slice(0, TELEGRAM_MAX_CAPTION_LENGTH - 1)}…`;
}

function truncateLogBody(body: string, maxLength = 500): string {
  const trimmed = body.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength)}…`;
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: string }).name === 'AbortError'
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
