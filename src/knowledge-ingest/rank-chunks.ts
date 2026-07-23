import { promises as fs } from 'node:fs';
import path from 'node:path';

export type FilterThemesConfig = {
  version: string;
  defaults: {
    maxExtractChunks: number;
    minScore: number;
    alwaysIncludeGenres: string[];
  };
  genres: Record<string, { description: string; keywords: string[] }>;
  skipHints?: { description?: string; keywords: string[] };
};

export type RankedChunk = {
  file: string;
  score: number;
  matchedKeywords: string[];
  length: number;
};

export async function loadFilterThemes(
  knowledgeRoot: string,
): Promise<FilterThemesConfig> {
  const filePath = path.join(knowledgeRoot, '_prompts', 'filter-themes.json');
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as FilterThemesConfig;
}

export function resolveGenreKeywords(
  config: FilterThemesConfig,
  genres: string[],
): { keywords: string[]; missing: string[] } {
  const missing: string[] = [];
  const set = new Set<string>();
  const ordered = [
    ...config.defaults.alwaysIncludeGenres,
    ...genres.filter((g) => !config.defaults.alwaysIncludeGenres.includes(g)),
  ];
  for (const id of ordered) {
    const genre = config.genres[id];
    if (!genre) {
      missing.push(id);
      continue;
    }
    for (const kw of genre.keywords) {
      set.add(kw.toLowerCase());
    }
  }
  return { keywords: [...set], missing };
}

export function scoreChunkText(
  text: string,
  keywords: string[],
  skipHints: string[] = [],
): { score: number; matchedKeywords: string[] } {
  const lower = text.toLowerCase();
  const matched: string[] = [];
  let score = 0;
  for (const kw of keywords) {
    if (kw && lower.includes(kw.toLowerCase())) {
      score += 1;
      matched.push(kw);
    }
  }
  if (/\n\s*[-•*\d]+[.)]?\s/.test(text)) {
    score += 2;
  }
  const head = text.slice(0, 500).toLowerCase();
  let skipHits = 0;
  for (const hint of skipHints) {
    if (hint && head.includes(hint.toLowerCase())) {
      skipHits += 1;
    }
  }
  if (skipHits >= 2 && text.length < 2000) {
    score = Math.max(0, score - 3);
  }
  return { score, matchedKeywords: matched };
}

export async function rankChunksInDir(
  rawDocDir: string,
  config: FilterThemesConfig,
  genres: string[],
): Promise<{
  ranked: RankedChunk[];
  selected: RankedChunk[];
  missingGenres: string[];
  keywordsUsed: string[];
}> {
  const { keywords, missing } = resolveGenreKeywords(config, genres);
  const skipHints = config.skipHints?.keywords ?? [];
  const entries = await fs.readdir(rawDocDir);
  const chunkFiles = entries
    .filter((f) => f.startsWith('chunk-') && f.endsWith('.txt'))
    .sort();

  const ranked: RankedChunk[] = [];
  for (const file of chunkFiles) {
    const text = await fs.readFile(path.join(rawDocDir, file), 'utf8');
    const { score, matchedKeywords } = scoreChunkText(
      text,
      keywords,
      skipHints,
    );
    ranked.push({
      file,
      score,
      matchedKeywords,
      length: text.length,
    });
  }

  ranked.sort((a, b) => b.score - a.score || a.file.localeCompare(b.file));
  const selected = ranked
    .filter((r) => r.score >= config.defaults.minScore)
    .slice(0, config.defaults.maxExtractChunks);

  return {
    ranked,
    selected,
    missingGenres: missing,
    keywordsUsed: keywords,
  };
}
