import path from 'node:path';
import { dryRunKnowledgeIngest } from '../src/knowledge-ingest/pipeline';
import type { PlaybookAssetType } from '../src/knowledge-ingest/playbook-template';

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  let target: PlaybookAssetType = 'equity';
  let apply = false;

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
    if (arg === '--apply') {
      apply = true;
      continue;
    }
    if (arg.startsWith('-')) {
      throw new Error(`Unknown flag: ${arg}`);
    }
    positional.push(arg);
  }

  if (positional.length !== 1) {
    throw new Error(
      'Usage: npm run knowledge:dry-run -- <source.txt|pdf> [--target equity|cedear|bond|other] [--apply]',
    );
  }

  return { sourcePath: path.resolve(positional[0]), target, apply };
}

async function main() {
  const { sourcePath, target, apply } = parseArgs(process.argv.slice(2));
  const knowledgeRoot = path.resolve(process.cwd(), 'knowledge');
  const result = await dryRunKnowledgeIngest({
    knowledgeRoot,
    sourcePath,
    target,
    apply,
  });

  console.log(
    JSON.stringify(
      {
        docId: result.docId,
        sourceHash: result.sourceHash,
        knowledgeVersion: result.knowledgeVersion,
        chunkCount: result.chunkCount,
        cacheHits: result.cacheHits,
        cacheMisses: result.cacheMisses,
        draftPath: path.relative(process.cwd(), result.draftPath),
        appliedPath: result.appliedPath ?? null,
        rawDir: path.relative(process.cwd(), result.rawDir),
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
