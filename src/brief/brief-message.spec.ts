import { TELEGRAM_MAX_MESSAGE_LENGTH } from '../notifications/telegram.constants';
import {
  formatBriefHelpMessage,
  formatBriefMessage,
  formatBriefUsageMessage,
} from './brief-message';
import { BriefSections } from './brief.types';

const sections: BriefSections = {
  overview: 'Company overview',
  fundamental: 'Look at margins',
  technical: 'Watch structure',
  risks: 'Competition',
  invalidation: 'Thesis breaks if guidance collapses',
  disclaimer: 'Educational only; not investment advice.',
};

describe('brief-message', () => {
  it('formats stance, market provenance, and holding context in English', () => {
    const message = formatBriefMessage(
      {
        symbol: 'AAPL',
        sections,
        holding: {
          symbol: 'AAPL',
          assetTypes: ['equity'],
          notes: 'core holding',
        },
        stance: 'hold',
        stanceRationale: 'No exit trigger on verified closes',
        marketSource: 'yahoo-finance-chart',
        marketAsOf: new Date('2026-07-17T15:00:00.000Z'),
      },
      'en',
    );

    expect(message).toContain('Personal research brief: AAPL');
    expect(message).toContain(
      'Recommendation stance: Hold (personal recommendation)',
    );
    expect(message).toContain('No exit trigger on verified closes');
    expect(message).toContain('yahoo-finance-chart');
    expect(message).toContain('Not a broker order');
    expect(message).toContain('Overview:');
    expect(message).toContain('Holdings context');
    expect(message).toContain('relative to that position');
    expect(message).toContain('core holding');
    expect(message).toContain('Disclaimer:');
  });

  it('declares insufficiency without stance when market data is missing', () => {
    const message = formatBriefMessage(
      {
        symbol: 'GGAL',
        sections,
        holding: null,
        stance: null,
        stanceRationale: null,
        marketSource: null,
        marketAsOf: null,
      },
      'es',
    );

    expect(message).toContain('Brief personal de research: GGAL');
    expect(message).toContain('No se emitió postura');
    expect(message).not.toContain('Postura recomendada');
    expect(message).toContain('Qué invalidaría la tesis');
  });

  it('keeps disclaimer and closing banner when body exceeds Telegram limit', () => {
    const longSection = 'x'.repeat(2_000);
    const message = formatBriefMessage(
      {
        symbol: 'AAPL',
        sections: {
          overview: longSection,
          fundamental: longSection,
          technical: longSection,
          risks: longSection,
          invalidation: longSection,
          disclaimer: 'MUST-KEEP-DISCLAIMER not investment advice',
        },
        holding: null,
        stance: 'watch',
        stanceRationale: 'y'.repeat(1_500),
        marketSource: 'yahoo-finance-chart',
        marketAsOf: new Date('2026-07-17T15:00:00.000Z'),
      },
      'en',
    );

    expect(message.length).toBeLessThanOrEqual(TELEGRAM_MAX_MESSAGE_LENGTH);
    expect(message).toContain('MUST-KEEP-DISCLAIMER not investment advice');
    expect(message).toContain('Not a broker order');
    expect(message.endsWith('Not a broker order.')).toBe(true);
  });

  it('returns localized help and usage strings that mention labeled stance', () => {
    expect(formatBriefHelpMessage('en')).toContain('labeled recommendation');
    expect(formatBriefHelpMessage('es')).toContain('recomendación etiquetada');
    expect(formatBriefUsageMessage('en')).toContain('/brief TICKER');
    expect(formatBriefUsageMessage('es')).toContain('/brief TICKER');
  });
});
