import { chunkText } from './chunk';
import { DEFAULT_CHUNK_CHARS } from './chunk-limits';

describe('chunkText', () => {
  it('should return empty array for blank input', () => {
    expect(chunkText('   ')).toEqual([]);
  });

  it('should keep short text as a single chunk', () => {
    const chunks = chunkText('Hello world earnings guidance');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].index).toBe(0);
    expect(chunks[0].id).toMatch(/^chunk-000-/);
    expect(chunks[0].contentHash).toHaveLength(64);
  });

  it('should split long text under maxChars and report stable hashes', () => {
    const paragraph = 'Earnings beat with guidance raise. '.repeat(200);
    const chunks = chunkText(paragraph, {
      maxChars: 400,
      overlap: 40,
    });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.text.length <= 400)).toBe(true);
    expect(chunks[0].contentHash).not.toEqual(chunks[1].contentHash);
  });

  it('should default maxChars to DEFAULT_CHUNK_CHARS', () => {
    const text = 'x'.repeat(DEFAULT_CHUNK_CHARS + 50);
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].text.length).toBeLessThanOrEqual(DEFAULT_CHUNK_CHARS);
  });
});
