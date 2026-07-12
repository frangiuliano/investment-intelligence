import { TELEGRAM_MAX_MESSAGE_LENGTH } from './telegram.constants';
import {
  formatTelegramAlert,
  formatTelegramTestMessage,
} from './telegram-message';

describe('telegram-message', () => {
  it('should format an alert with title, summary, sentiment, tickers, and URL', () => {
    const message = formatTelegramAlert({
      title: 'Oil slides',
      summary: 'Crude fell on inventory data.',
      sentiment: 'negative',
      tickers: ['XOM', 'CVX'],
      url: 'https://news.example.com/oil',
    });

    expect(message).toContain('Title: Oil slides');
    expect(message).toContain('Summary: Crude fell on inventory data.');
    expect(message).toContain('Sentiment: negative');
    expect(message).toContain('Tickers: XOM, CVX');
    expect(message).toContain('URL: https://news.example.com/oil');
  });

  it('should collapse newlines in fields', () => {
    const message = formatTelegramAlert({
      title: 'Line\nbreak',
      summary: 'A\r\nB',
      sentiment: 'positive',
      tickers: ['AAPL'],
      url: 'https://news.example.com/a',
    });

    expect(message).toContain('Title: Line break');
    expect(message).toContain('Summary: A B');
  });

  it('should truncate messages longer than Telegram limit', () => {
    const message = formatTelegramAlert({
      title: 'Long',
      summary: 'x'.repeat(TELEGRAM_MAX_MESSAGE_LENGTH),
      sentiment: 'positive',
      tickers: ['AAPL'],
      url: 'https://news.example.com/long',
    });

    expect(message.length).toBe(TELEGRAM_MAX_MESSAGE_LENGTH);
    expect(message.endsWith('…')).toBe(true);
  });

  it('should format a test message', () => {
    expect(formatTelegramTestMessage()).toContain('test notification');
  });
});
