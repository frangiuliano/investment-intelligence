import { parseRetryAfterMs, resolveRetryDelayMs } from './gemini-retry';

describe('gemini-retry', () => {
  describe('parseRetryAfterMs', () => {
    it('should prefer Retry-After header seconds', () => {
      expect(parseRetryAfterMs('ignored', '12')).toBe(12_000);
    });

    it('should parse Gemini free-tier retry hint from body', () => {
      const body = 'Quota exceeded... Please retry in 39.167134377s. More text';
      expect(parseRetryAfterMs(body, null)).toBe(39_168);
    });

    it('should return undefined when no hint is present', () => {
      expect(parseRetryAfterMs('rate limited', null)).toBeUndefined();
    });
  });

  describe('resolveRetryDelayMs', () => {
    it('should use the larger of exponential backoff and retry-after, capped', () => {
      expect(
        resolveRetryDelayMs({
          attempt: 1,
          baseMs: 1000,
          retryAfterMs: 39_000,
          maxMs: 60_000,
        }),
      ).toBe(39_000);

      expect(
        resolveRetryDelayMs({
          attempt: 3,
          baseMs: 1000,
          retryAfterMs: undefined,
          maxMs: 60_000,
        }),
      ).toBe(4_000);

      expect(
        resolveRetryDelayMs({
          attempt: 1,
          baseMs: 1000,
          retryAfterMs: 120_000,
          maxMs: 60_000,
        }),
      ).toBe(60_000);
    });
  });
});
