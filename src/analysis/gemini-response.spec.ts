import {
  buildAnalysisSystemPrompt,
  buildAnalysisUserPrompt,
  parseGeminiAnalysisText,
  truncateForPrompt,
} from './gemini-response';

describe('gemini-response', () => {
  describe('truncateForPrompt', () => {
    it('should return empty string for blank content', () => {
      expect(truncateForPrompt(null)).toBe('');
      expect(truncateForPrompt(undefined)).toBe('');
      expect(truncateForPrompt('   ')).toBe('');
    });

    it('should truncate long content to the configured limit', () => {
      expect(truncateForPrompt('a'.repeat(10_000), 100).length).toBe(100);
    });
  });

  describe('parseGeminiAnalysisText', () => {
    it('should parse a structured Gemini JSON payload', () => {
      const result = parseGeminiAnalysisText(
        JSON.stringify({
          summary: 'Apple rose after earnings.',
          sentiment: 'positive',
          tickers: ['aapl', 'MSFT', 'aapl', 'bad ticker!'],
          materiality: 'high',
        }),
      );

      expect(result).toEqual({
        summary: 'Apple rose after earnings.',
        sentiment: 'positive',
        tickers: ['AAPL', 'MSFT'],
        materiality: 'high',
      });
    });

    it('should parse JSON wrapped in markdown fences', () => {
      const result = parseGeminiAnalysisText(`\`\`\`json
{"summary":"Mixed signals","sentiment":"neutral","tickers":[],"materiality":"low"}
\`\`\``);

      expect(result.sentiment).toBe('neutral');
      expect(result.tickers).toEqual([]);
      expect(result.materiality).toBe('low');
    });

    it('should reject invalid sentiment values', () => {
      expect(() =>
        parseGeminiAnalysisText(
          JSON.stringify({
            summary: 'x',
            sentiment: 'bullish',
            tickers: [],
            materiality: 'medium',
          }),
        ),
      ).toThrow(/invalid sentiment/i);
    });

    it('should reject invalid materiality values', () => {
      expect(() =>
        parseGeminiAnalysisText(
          JSON.stringify({
            summary: 'x',
            sentiment: 'positive',
            tickers: ['AAPL'],
            materiality: 'critical',
          }),
        ),
      ).toThrow(/invalid materiality/i);
    });

    it('should reject missing materiality', () => {
      expect(() =>
        parseGeminiAnalysisText(
          JSON.stringify({
            summary: 'x',
            sentiment: 'positive',
            tickers: ['AAPL'],
          }),
        ),
      ).toThrow(/missing materiality/i);
    });
  });

  describe('buildAnalysisSystemPrompt', () => {
    it('should instruct an English summary when locale is en', () => {
      const prompt = buildAnalysisSystemPrompt('en');

      expect(prompt).toContain('Write the summary in English.');
      expect(prompt).toContain('concise English summary');
      expect(prompt).toContain(
        'sentiment: one of "positive", "negative", "neutral"',
      );
      expect(prompt).toContain('tickers: array of stock ticker symbols');
      expect(prompt).toContain('materiality: one of "low", "medium", "high"');
    });

    it('should instruct a Spanish summary when locale is es', () => {
      const prompt = buildAnalysisSystemPrompt('es');

      expect(prompt).toContain('Write the summary in Spanish.');
      expect(prompt).toContain('concise Spanish summary');
      expect(prompt).toContain(
        'sentiment: one of "positive", "negative", "neutral"',
      );
      expect(prompt).toContain('tickers: array of stock ticker symbols');
      expect(prompt).toContain('materiality: one of "low", "medium", "high"');
      expect(prompt).not.toContain('concise English summary');
    });
  });

  describe('buildAnalysisUserPrompt', () => {
    it('should include title source url and truncated content', () => {
      const prompt = buildAnalysisUserPrompt({
        title: 'Rate cut expected',
        source: 'Example Finance',
        url: 'https://news.example.com/rates',
        content: 'Markets expect a rate cut.',
      });

      expect(prompt).toContain('Title: Rate cut expected');
      expect(prompt).toContain('Source: Example Finance');
      expect(prompt).toContain('URL: https://news.example.com/rates');
      expect(prompt).toContain('Markets expect a rate cut.');
    });
  });
});
