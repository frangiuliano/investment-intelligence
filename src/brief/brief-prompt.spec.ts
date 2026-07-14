import {
  BRIEF_PROMPT_VERSION,
  buildBriefSystemPrompt,
  buildBriefUserPrompt,
  parseBriefSectionsText,
} from './brief-prompt';

describe('brief-prompt', () => {
  it('builds a Spanish educational system prompt without buy/sell instructions', () => {
    const prompt = buildBriefSystemPrompt('es');
    expect(prompt).toContain('Spanish');
    expect(prompt).toContain('educational');
    expect(prompt).toContain('disclaimer');
    expect(prompt.toLowerCase()).toContain('buy/sell');
  });

  it('includes holding context and no-live-price constraint in the user prompt', () => {
    const prompt = buildBriefUserPrompt({
      symbol: 'AAPL',
      holding: {
        symbol: 'AAPL',
        assetTypes: ['equity'],
        notes: 'long thesis',
      },
    });

    expect(prompt).toContain('Ticker: AAPL');
    expect(prompt).toContain('No live market data');
    expect(prompt).toContain('assetTypes=equity');
    expect(prompt).toContain(
      '<<OPERATOR_NOTES>>long thesis<</OPERATOR_NOTES>>',
    );
    expect(prompt).toContain('untrusted operator text');
    expect(BRIEF_PROMPT_VERSION).toBe('brief-v1');
  });

  it('parses fixed brief sections from JSON', () => {
    const sections = parseBriefSectionsText(
      JSON.stringify({
        overview: 'Overview text',
        fundamental: 'Fundamental text',
        technical: 'Technical text',
        risks: 'Risks text',
        invalidation: 'Invalidation text',
        disclaimer: 'Not advice',
      }),
    );

    expect(sections.overview).toBe('Overview text');
    expect(sections.invalidation).toBe('Invalidation text');
    expect(sections.disclaimer).toBe('Not advice');
  });

  it('rejects missing sections', () => {
    expect(() =>
      parseBriefSectionsText(
        JSON.stringify({
          overview: 'only overview',
        }),
      ),
    ).toThrow(/missing section/i);
  });
});
