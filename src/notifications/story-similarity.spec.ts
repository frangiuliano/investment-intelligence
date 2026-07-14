import {
  areSameStory,
  eventTypesCompatible,
  hasTickerOverlap,
  jaccardSimilarity,
  resolveStoryReferenceAt,
  StoryCandidate,
  tokenizeForSimilarity,
  withinStoryWindow,
} from './story-similarity';

function candidate(
  overrides: Partial<StoryCandidate> & Pick<StoryCandidate, 'articleId'>,
): StoryCandidate {
  return {
    title: 'SpaceX filing points to IPO later this year',
    summary:
      'SpaceX confidentially filed paperwork related to a potential IPO.',
    tickers: ['TSLA'],
    eventType: 'ipo',
    referenceAt: new Date('2026-07-14T12:00:00.000Z'),
    ...overrides,
  };
}

describe('story-similarity', () => {
  describe('tokenizeForSimilarity / jaccardSimilarity', () => {
    it('should score identical token sets as 1', () => {
      const tokens = tokenizeForSimilarity('Apple reports strong earnings');
      expect(jaccardSimilarity(tokens, tokens)).toBe(1);
    });

    it('should score disjoint token sets as 0', () => {
      expect(
        jaccardSimilarity(
          tokenizeForSimilarity('apple earnings beat'),
          tokenizeForSimilarity('oil inventory rise'),
        ),
      ).toBe(0);
    });
  });

  describe('hasTickerOverlap / eventTypesCompatible / withinStoryWindow', () => {
    it('should detect ticker overlap case-insensitively', () => {
      expect(hasTickerOverlap(['tsla', 'AAPL'], ['TSLA'])).toBe(true);
      expect(hasTickerOverlap(['MSFT'], ['AAPL'])).toBe(false);
    });

    it('should treat none/other as compatible soft event types', () => {
      expect(eventTypesCompatible('none', 'other')).toBe(true);
      expect(eventTypesCompatible('ipo', 'earnings')).toBe(false);
      expect(eventTypesCompatible('ipo', 'ipo')).toBe(true);
    });

    it('should enforce the temporal window', () => {
      const a = new Date('2026-07-14T12:00:00.000Z');
      const b = new Date('2026-07-15T11:00:00.000Z');
      const c = new Date('2026-07-15T13:00:00.000Z');

      expect(withinStoryWindow(a, b, 24)).toBe(true);
      expect(withinStoryWindow(a, c, 24)).toBe(false);
    });
  });

  describe('areSameStory', () => {
    it('should match two articles about the same IPO story', () => {
      const left = candidate({ articleId: 'a1' });
      const right = candidate({
        articleId: 'a2',
        title: 'SpaceX IPO filing sparks listing chatter later this year',
        summary:
          'Reports say SpaceX filed confidential IPO paperwork with regulators.',
        referenceAt: new Date('2026-07-14T14:00:00.000Z'),
      });

      expect(areSameStory(left, right)).toBe(true);
    });

    it('should not match without ticker overlap', () => {
      expect(
        areSameStory(
          candidate({ articleId: 'a1', tickers: ['TSLA'] }),
          candidate({ articleId: 'a2', tickers: ['AAPL'] }),
        ),
      ).toBe(false);
    });

    it('should not match incompatible catalyst types', () => {
      expect(
        areSameStory(
          candidate({ articleId: 'a1', eventType: 'ipo' }),
          candidate({ articleId: 'a2', eventType: 'earnings' }),
        ),
      ).toBe(false);
    });

    it('should not match unrelated titles even with shared ticker', () => {
      expect(
        areSameStory(
          candidate({
            articleId: 'a1',
            title: 'Tesla delivers record vehicles in China',
            summary: 'Delivery numbers rose sharply in the latest quarter.',
            eventType: 'none',
          }),
          candidate({
            articleId: 'a2',
            title: 'Oil prices fall after inventory surprise',
            summary: 'Crude inventories climbed more than expected.',
            tickers: ['TSLA', 'XOM'],
            eventType: 'none',
          }),
        ),
      ).toBe(false);
    });
  });

  describe('resolveStoryReferenceAt', () => {
    it('should prefer publishedAt when present', () => {
      const publishedAt = new Date('2026-07-10T00:00:00.000Z');
      const analyzedAt = new Date('2026-07-14T00:00:00.000Z');

      expect(resolveStoryReferenceAt({ publishedAt, analyzedAt })).toBe(
        publishedAt,
      );
      expect(resolveStoryReferenceAt({ publishedAt: null, analyzedAt })).toBe(
        analyzedAt,
      );
    });
  });
});
