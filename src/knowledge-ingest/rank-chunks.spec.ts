import {
  resolveGenreKeywords,
  scoreChunkText,
} from './rank-chunks';
import type { FilterThemesConfig } from './rank-chunks';

const sampleConfig: FilterThemesConfig = {
  version: 'test',
  defaults: {
    maxExtractChunks: 16,
    minScore: 4,
    alwaysIncludeGenres: ['core'],
  },
  genres: {
    core: {
      description: 'core',
      keywords: ['materiality', 'risk'],
    },
    trading_psychology: {
      description: 'psych',
      keywords: ['probability', 'discipline'],
    },
  },
  skipHints: {
    keywords: ['copyright', 'isbn'],
  },
};

describe('rank-chunks', () => {
  it('merges core + requested genre keywords', () => {
    const { keywords, missing } = resolveGenreKeywords(sampleConfig, [
      'trading_psychology',
    ]);
    expect(missing).toEqual([]);
    expect(keywords).toEqual(
      expect.arrayContaining([
        'materiality',
        'risk',
        'probability',
        'discipline',
      ]),
    );
  });

  it('scores method-rich text higher than fluff', () => {
    const keywords = ['probability', 'risk', 'discipline'];
    const rich = scoreChunkText(
      'Think in probability.\n1. Predefine risk\n2. Keep discipline',
      keywords,
    );
    const fluff = scoreChunkText('Once upon a time in a market far away.', keywords);
    expect(rich.score).toBeGreaterThan(fluff.score);
  });

  it('down-ranks short front-matter with skip hints', () => {
    const keywords = ['risk'];
    const front = scoreChunkText(
      'Copyright 1990\nISBN 123\nAll rights reserved.\nrisk mentioned',
      keywords,
      ['copyright', 'isbn'],
    );
    expect(front.score).toBeLessThanOrEqual(1);
  });
});
