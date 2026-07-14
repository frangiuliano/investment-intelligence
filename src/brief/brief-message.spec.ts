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
  it('formats all educational sections and holding context in English', () => {
    const message = formatBriefMessage(
      {
        symbol: 'AAPL',
        sections,
        holding: {
          symbol: 'AAPL',
          assetTypes: ['equity'],
          notes: 'core holding',
        },
      },
      'en',
    );

    expect(message).toContain('Educational research brief: AAPL');
    expect(message).toContain('No live market quotes');
    expect(message).toContain('Overview:');
    expect(message).toContain('Company overview');
    expect(message).toContain('What would invalidate the thesis');
    expect(message).toContain('Holdings context');
    expect(message).toContain('not a sell or reduce instruction');
    expect(message).toContain('core holding');
    expect(message).toContain('Disclaimer:');
    expect(message).toContain('not investment advice');
  });

  it('formats Spanish labels and omits holdings when absent', () => {
    const message = formatBriefMessage(
      {
        symbol: 'GGAL',
        sections,
        holding: null,
      },
      'es',
    );

    expect(message).toContain('Brief educativo de research: GGAL');
    expect(message).toContain('Qué invalidaría la tesis');
    expect(message).not.toContain('Contexto de cartera');
  });

  it('returns localized help and usage strings', () => {
    expect(formatBriefHelpMessage('en')).toContain('/brief TICKER');
    expect(formatBriefHelpMessage('es')).toContain('/brief TICKER');
    expect(formatBriefUsageMessage('en')).toContain('/brief TICKER');
    expect(formatBriefUsageMessage('es')).toContain('/brief TICKER');
  });
});
