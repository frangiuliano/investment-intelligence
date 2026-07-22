import path from 'node:path';
import { prepareKnowledgeIngest } from '../src/knowledge-ingest/pipeline';
import type { PlaybookAssetType } from '../src/knowledge-ingest/playbook-template';

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  let target: PlaybookAssetType = 'equity';

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--target') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('--target requires equity|cedear|bond|other');
      }
      if (!['equity', 'cedear', 'bond', 'other'].includes(value)) {
        throw new Error(`Invalid --target: ${value}`);
      }
      target = value as PlaybookAssetType;
      i += 1;
      continue;
    }
    if (arg.startsWith('-')) {
      throw new Error(`Unknown flag: ${arg}`);
    }
    positional.push(arg);
  }

  if (positional.length !== 1) {
    throw new Error(
      'Usage: npm run knowledge:prepare -- <source.txt|pdf> [--target equity|cedear|bond|other]',
    );
  }

  return { sourcePath: path.resolve(positional[0]), target };
}

async function main() {
  const { sourcePath, target } = parseArgs(process.argv.slice(2));
  const knowledgeRoot = path.resolve(process.cwd(), 'knowledge');
  const result = await prepareKnowledgeIngest({
    knowledgeRoot,
    sourcePath,
    target,
  });

  console.log(
    JSON.stringify(
      {
        docId: result.docId,
        sourceHash: result.sourceHash,
        format: result.format,
        extractor: result.extractor,
        chunkCount: result.chunkCount,
        cacheHits: result.cacheHits,
        cacheMisses: result.cacheMisses,
        rawDir: path.relative(process.cwd(), result.rawDir),
        chunks: result.chunks.map((c) => ({
          id: c.id,
          cacheHit: c.cacheHit,
          path: c.path,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
