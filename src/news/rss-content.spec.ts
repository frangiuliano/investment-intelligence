import {
  computeContentHash,
  firstNonEmpty,
  isAllowedHttpUrl,
  resolveItemUrl,
  sanitizeContent,
  sanitizeTitle,
  stripHtml,
  truncate,
} from './rss-content';

describe('rss-content', () => {
  describe('isAllowedHttpUrl', () => {
    it('should accept public https URLs', () => {
      expect(isAllowedHttpUrl('https://feeds.example.com/rss')).toBe(true);
    });

    it('should reject non-http schemes and private hosts', () => {
      expect(isAllowedHttpUrl('file:///etc/passwd')).toBe(false);
      expect(isAllowedHttpUrl('https://localhost/feed')).toBe(false);
      expect(isAllowedHttpUrl('http://192.168.1.10/rss')).toBe(false);
      expect(isAllowedHttpUrl('http://metadata.google.internal/')).toBe(false);
      expect(isAllowedHttpUrl('http://[::ffff:127.0.0.1]/feed')).toBe(false);
      expect(isAllowedHttpUrl('http://[fc00::1]/feed')).toBe(false);
      expect(isAllowedHttpUrl('not-a-url')).toBe(false);
    });
  });

  describe('stripHtml and sanitize', () => {
    it('should strip tags and scripts from content', () => {
      const raw =
        '<p>Hello <b>world</b></p><script>alert(1)</script><style>.x{}</style>';
      expect(stripHtml(raw)).toBe('Hello world');
    });

    it('should truncate titles and content to configured limits', () => {
      expect(sanitizeTitle(`<h1>${'a'.repeat(600)}</h1>`)?.length).toBe(500);
      expect(sanitizeContent('b'.repeat(60_000))?.length).toBe(50_000);
      expect(sanitizeTitle('   ')).toBeNull();
    });

    it('should truncate helper values', () => {
      expect(truncate('abcdef', 3)).toBe('abc');
      expect(truncate('ab', 3)).toBe('ab');
    });
  });

  describe('firstNonEmpty and resolveItemUrl', () => {
    it('should skip blank content values when picking a body', () => {
      expect(firstNonEmpty('', '  ', 'snippet', 'summary')).toBe('snippet');
      expect(firstNonEmpty(undefined, null, '')).toBeUndefined();
    });

    it('should prefer link and fall back to guid when it is an http URL', () => {
      expect(
        resolveItemUrl([undefined, 'https://news.example.com/via-guid']),
      ).toBe('https://news.example.com/via-guid');
      expect(
        resolveItemUrl(['https://news.example.com/a', 'guid-not-url']),
      ).toBe('https://news.example.com/a');
      expect(resolveItemUrl(['', 'not-a-url'])).toBeNull();
    });
  });

  describe('computeContentHash', () => {
    it('should hash content when present and fall back to title|url', () => {
      const withContent = computeContentHash({
        title: 'T',
        url: 'https://example.com/a',
        content: 'body',
      });
      const sameContent = computeContentHash({
        title: 'Other',
        url: 'https://example.com/b',
        content: 'body',
      });
      const emptyContent = computeContentHash({
        title: 'T',
        url: 'https://example.com/a',
        content: null,
      });

      expect(withContent).toHaveLength(64);
      expect(withContent).toBe(sameContent);
      expect(emptyContent).not.toBe(withContent);
      expect(emptyContent).toHaveLength(64);
    });
  });
});
