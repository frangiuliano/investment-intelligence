import { TELEGRAM_MAX_MESSAGE_LENGTH } from './telegram.constants';
import {
  formatTelegramAlert,
  formatTelegramTestMessage,
} from './telegram-message';

describe('telegram-message', () => {
  it('should format an English alert with title, summary, sentiment, tickers, and URL', () => {
    const message = formatTelegramAlert(
      {
        title: 'Oil slides',
        summary: 'Crude fell on inventory data.',
        sentiment: 'negative',
        tickers: ['XOM', 'CVX'],
        url: 'https://news.example.com/oil',
      },
      'en',
    );

    expect(message).toContain('Relevant news alert');
    expect(message).toContain('Title: Oil slides');
    expect(message).toContain('Summary: Crude fell on inventory data.');
    expect(message).toContain('Sentiment: negative');
    expect(message).toContain('Tickers: XOM, CVX');
    expect(message).toContain('URL: https://news.example.com/oil');
  });

  it('should format a Spanish alert with localized labels', () => {
    const message = formatTelegramAlert(
      {
        title: 'Oil slides',
        summary: 'El crudo cayó por inventarios.',
        sentiment: 'negative',
        tickers: ['XOM', 'CVX'],
        url: 'https://news.example.com/oil',
      },
      'es',
    );

    expect(message).toContain('Alerta de noticia relevante');
    expect(message).toContain('Título: Oil slides');
    expect(message).toContain('Resumen: El crudo cayó por inventarios.');
    expect(message).toContain('Sentimiento: negative');
    expect(message).toContain('Tickers: XOM, CVX');
    expect(message).toContain('URL: https://news.example.com/oil');
  });

  it('should use localized empty-tickers placeholder', () => {
    expect(
      formatTelegramAlert(
        {
          title: 'A',
          summary: 'B',
          sentiment: 'neutral',
          tickers: [],
          url: 'https://news.example.com/a',
        },
        'en',
      ),
    ).toContain('Tickers: (none)');

    expect(
      formatTelegramAlert(
        {
          title: 'A',
          summary: 'B',
          sentiment: 'neutral',
          tickers: [],
          url: 'https://news.example.com/a',
        },
        'es',
      ),
    ).toContain('Tickers: (ninguno)');
  });

  it('should collapse newlines in fields', () => {
    const message = formatTelegramAlert(
      {
        title: 'Line\nbreak',
        summary: 'A\r\nB',
        sentiment: 'positive',
        tickers: ['AAPL'],
        url: 'https://news.example.com/a',
      },
      'en',
    );

    expect(message).toContain('Title: Line break');
    expect(message).toContain('Summary: A B');
  });

  it('should truncate messages longer than Telegram limit', () => {
    const message = formatTelegramAlert(
      {
        title: 'Long',
        summary: 'x'.repeat(TELEGRAM_MAX_MESSAGE_LENGTH),
        sentiment: 'positive',
        tickers: ['AAPL'],
        url: 'https://news.example.com/long',
      },
      'en',
    );

    expect(message.length).toBe(TELEGRAM_MAX_MESSAGE_LENGTH);
    expect(message.endsWith('…')).toBe(true);
  });

  it('should format a test message in English and Spanish', () => {
    expect(formatTelegramTestMessage('en')).toContain('test notification');
    expect(formatTelegramTestMessage('es')).toContain('notificación de prueba');
    expect(formatTelegramTestMessage('es')).toContain(
      'Telegram está configurado correctamente',
    );
  });
});
