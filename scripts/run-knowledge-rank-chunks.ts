import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  loadFilterThemes,
  rankChunksInDir,
} from '../src/knowledge-ingest/rank-chunks';

function printHelp(): void {
  console.log(`Usage:
  npm run knowledge:rank-chunks -- <rawDocDir> --genre <id>[,<id>...]

Examples:
  npm run knowledge:rank-chunks -- knowledge/raw/pdfcoffee-com-trading-en-la-zona-pdf-free-71f96a6b --genre trading_psychology
  npm run knowledge:rank-chunks -- knowledge/raw/velas-importantes-c6d2ee47 --genre technical_analysis

Genres are defined in knowledge/_prompts/filter-themes.json (Finance Advisor).
Writes selected-chunks.json under the raw doc dir.
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    printHelp();
    process.exit(args.length === 0 ? 1 : 0);
  }

  let rawDocDir: string | undefined;
  let genreArg = 'core';
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--genre' && args[i + 1]) {
      genreArg = args[++i];
      continue;
    }
    if (!a.startsWith('-') && !rawDocDir) {
      rawDocDir = a;
    }
  }

  if (!rawDocDir) {
    printHelp();
    process.exit(1);
  }

  const repoRoot = process.cwd();
  const knowledgeRoot = path.join(repoRoot, 'knowledge');
  const absoluteRaw = path.isAbsolute(rawDocDir)
    ? rawDocDir
    : path.join(repoRoot, rawDocDir);

  const genres = genreArg
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean);
  const config = await loadFilterThemes(knowledgeRoot);
  const result = await rankChunksInDir(absoluteRaw, config, genres);

  if (result.missingGenres.length > 0) {
    console.error(
      `Unknown genre(s): ${result.missingGenres.join(', ')}. See filter-themes.json`,
    );
    process.exit(1);
  }

  const out = {
    filterThemesVersion: config.version,
    genres,
    minScore: config.defaults.minScore,
    maxExtractChunks: config.defaults.maxExtractChunks,
    selectedCount: result.selected.length,
    totalChunks: result.ranked.length,
    selected: result.selected,
    rankedTop30: result.ranked.slice(0, 30),
  };

  const outPath = path.join(absoluteRaw, 'selected-chunks.json');
  await fs.writeFile(outPath, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(out, null, 2));
  console.error(`Wrote ${path.relative(repoRoot, outPath)}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
