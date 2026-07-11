import {
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
        }),
      );

      expect(result).toEqual({
        summary: 'Apple rose after earnings.',
        sentiment: 'positive',
        tickers: ['AAPL', 'MSFT'],
      });
    });

    it('should parse JSON wrapped in markdown fences', () => {
      const result = parseGeminiAnalysisText(`\`\`\`json
{"summary":"Mixed signals","sentiment":"neutral","tickers":[]}
\`\`\``);

      expect(result.sentiment).toBe('neutral');
      expect(result.tickers).toEqual([]);
    });

    it('should reject invalid sentiment values', () => {
      expect(() =>
        parseGeminiAnalysisText(
          JSON.stringify({
            summary: 'x',
            sentiment: 'bullish',
            tickers: [],
          }),
        ),
      ).toThrow(/invalid sentiment/i);
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
