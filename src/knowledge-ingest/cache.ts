import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { TextChunk } from './chunk';
import { sha256Hex, shortHash } from './hash';

export type CachedChunkRecord = {
  id: string;
  index: number;
  contentHash: string;
  path: string;
  cacheHit: boolean;
};

export type PrepareResult = {
  docId: string;
  sourceHash: string;
  sourcePath: string;
  rawDir: string;
  chunks: CachedChunkRecord[];
  cacheHits: number;
  cacheMisses: number;
};

export function resolveDocId(sourcePath: string, sourceHash: string): string {
  const base = path
    .basename(sourcePath, path.extname(sourcePath))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'source'}-${shortHash(sourceHash, 8)}`;
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeChunkCache(params: {
  knowledgeRoot: string;
  docId: string;
  sourcePath: string;
  sourceText: string;
  sourceHash: string;
  chunks: TextChunk[];
  target: string;
}): Promise<PrepareResult> {
  const rawDir = path.join(params.knowledgeRoot, 'raw', params.docId);
  await ensureDir(rawDir);

  const metaPath = path.join(rawDir, 'meta.json');
  const meta = {
    docId: params.docId,
    sourcePath: params.sourcePath,
    sourceHash: params.sourceHash,
    target: params.target,
    chunkCount: params.chunks.length,
    updatedAt: new Date().toISOString().slice(0, 10),
  };
  await fs.writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

  const fullTextPath = path.join(rawDir, 'source.txt');
  await fs.writeFile(fullTextPath, params.sourceText, 'utf8');

  const records: CachedChunkRecord[] = [];
  let cacheHits = 0;
  let cacheMisses = 0;

  for (const chunk of params.chunks) {
    const relativeName = `${chunk.id}.txt`;
    const chunkPath = path.join(rawDir, relativeName);
    let cacheHit = false;

    try {
      const existing = await fs.readFile(chunkPath, 'utf8');
      if (sha256Hex(existing) === chunk.contentHash) {
        cacheHit = true;
        cacheHits += 1;
      }
    } catch {
      cacheHit = false;
    }

    if (!cacheHit) {
      await fs.writeFile(chunkPath, chunk.text, 'utf8');
      cacheMisses += 1;
    }

    records.push({
      id: chunk.id,
      index: chunk.index,
      contentHash: chunk.contentHash,
      path: path.relative(params.knowledgeRoot, chunkPath),
      cacheHit,
    });
  }

  const indexPath = path.join(rawDir, 'chunks.json');
  await fs.writeFile(
    indexPath,
    `${JSON.stringify(
      {
        docId: params.docId,
        sourceHash: params.sourceHash,
        chunks: records.map(({ id, index, contentHash, path: p }) => ({
          id,
          index,
          contentHash,
          path: p,
        })),
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  return {
    docId: params.docId,
    sourceHash: params.sourceHash,
    sourcePath: params.sourcePath,
    rawDir,
    chunks: records,
    cacheHits,
    cacheMisses,
  };
}
