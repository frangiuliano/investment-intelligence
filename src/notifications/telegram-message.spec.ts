import { TELEGRAM_MAX_MESSAGE_LENGTH } from './telegram.constants';
import {
  formatTelegramAlert,
  formatTelegramDigest,
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
    expect(message).not.toContain('Event:');
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
    expect(message).not.toContain('Evento:');
  });

  it('should include event type when not none', () => {
    const en = formatTelegramAlert(
      {
        title: 'IPO filing',
        summary: 'Company files to go public.',
        sentiment: 'neutral',
        tickers: ['XYZ'],
        url: 'https://news.example.com/ipo',
        eventType: 'ipo',
      },
      'en',
    );
    expect(en).toContain('Event: ipo');

    const es = formatTelegramAlert(
      {
        title: 'IPO filing',
        summary: 'La compañía presenta su oferta.',
        sentiment: 'neutral',
        tickers: ['XYZ'],
        url: 'https://news.example.com/ipo',
        eventType: 'ipo',
      },
      'es',
    );
    expect(es).toContain('Evento: ipo');
  });

  it('should omit event type when none or missing', () => {
    expect(
      formatTelegramAlert(
        {
          title: 'A',
          summary: 'B',
          sentiment: 'positive',
          tickers: ['AAPL'],
          url: 'https://news.example.com/a',
          eventType: 'none',
        },
        'en',
      ),
    ).not.toContain('Event:');
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

  it('should format an English digest with lookback and item count', () => {
    const message = formatTelegramDigest(
      {
        lookbackHours: 24,
        items: [
          {
            title: 'Oil slides',
            summary: 'Crude fell on inventory data.',
            sentiment: 'negative',
            materiality: 'medium',
            tickers: ['XOM'],
            url: 'https://news.example.com/oil',
          },
        ],
      },
      'en',
    );

    expect(message).toContain('News digest (24h)');
    expect(message).toContain('1 items');
    expect(message).toContain('1. Oil slides');
    expect(message).toContain('Tickers: XOM');
    expect(message).toContain('Materiality: medium');
    expect(message).toContain('Sentiment: negative');
    expect(message).toContain('https://news.example.com/oil');
  });

  it('should format a Spanish digest with localized labels', () => {
    const message = formatTelegramDigest(
      {
        lookbackHours: 168,
        items: [
          {
            title: 'Oil slides',
            summary: 'El crudo cayó.',
            sentiment: 'negative',
            materiality: 'high',
            tickers: ['XOM'],
            url: 'https://news.example.com/oil',
            eventType: 'other',
          },
        ],
      },
      'es',
    );

    expect(message).toContain('Digesto de noticias (168h)');
    expect(message).toContain('1 ítems');
    expect(message).toContain('Materialidad: high');
    expect(message).toContain('Evento: other');
  });

  it('should omit overflow items with a count footer under Telegram limit', () => {
    const items = Array.from({ length: 40 }, (_, index) => ({
      title: `Story ${index + 1} ${'title '.repeat(20)}`,
      summary: 'summary '.repeat(30),
      sentiment: 'positive',
      materiality: 'medium',
      tickers: ['AAPL', 'MSFT'],
      url: `https://news.example.com/${index + 1}`,
    }));

    const message = formatTelegramDigest({ lookbackHours: 24, items }, 'en');

    expect(message.length).toBeLessThanOrEqual(TELEGRAM_MAX_MESSAGE_LENGTH);
    expect(message).toContain('News digest (24h)');
    expect(message).toContain('40 items');
    expect(message).toMatch(/\(\+\d+ more omitted\)/);
  });
});
