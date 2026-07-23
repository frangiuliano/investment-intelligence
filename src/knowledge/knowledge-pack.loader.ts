import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { KnowledgeManifest } from '../knowledge-ingest/manifest';
import { KnowledgeChunk } from './knowledge.types';

export type LoadedKnowledgePack = {
  knowledgeVersion: string;
  playbooksByAssetType: Map<string, KnowledgeChunk>;
  rubricsById: Map<string, KnowledgeChunk>;
};

export async function loadKnowledgePackFromDisk(
  knowledgeRoot: string,
): Promise<LoadedKnowledgePack> {
  const manifestPath = path.join(knowledgeRoot, 'manifest.json');
  const raw = await fs.readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw) as KnowledgeManifest;

  if (
    typeof manifest.knowledgeVersion !== 'string' ||
    manifest.knowledgeVersion.trim().length === 0
  ) {
    throw new Error('Knowledge manifest missing knowledgeVersion');
  }

  const playbooksByAssetType = new Map<string, KnowledgeChunk>();
  for (const entry of manifest.playbooks ?? []) {
    const markdown = await readRelativeMarkdown(knowledgeRoot, entry.path);
    playbooksByAssetType.set(entry.assetType, {
      id: entry.id,
      kind: 'playbook',
      markdown,
    });
  }

  const rubricsById = new Map<string, KnowledgeChunk>();
  for (const entry of manifest.rubrics ?? []) {
    const markdown = await readRelativeMarkdown(knowledgeRoot, entry.path);
    rubricsById.set(entry.id, {
      id: entry.id,
      kind: 'rubric',
      markdown,
    });
  }

  return {
    knowledgeVersion: manifest.knowledgeVersion.trim(),
    playbooksByAssetType,
    rubricsById,
  };
}

async function readRelativeMarkdown(
  knowledgeRoot: string,
  relativePath: string,
): Promise<string> {
  const absolute = path.resolve(knowledgeRoot, relativePath);
  const rootResolved = path.resolve(knowledgeRoot);
  if (
    absolute !== rootResolved &&
    !absolute.startsWith(`${rootResolved}${path.sep}`)
  ) {
    throw new Error(`Knowledge path escapes root: ${relativePath}`);
  }
  const markdown = await fs.readFile(absolute, 'utf8');
  return markdown.trim();
}

/**
 * Assemble selected chunks under a character budget. Playbook first, then
 * rubrics in order; truncate the last chunk if needed.
 */
export function assembleKnowledgeMarkdown(
  chunks: KnowledgeChunk[],
  maxChars: number,
): { markdown: string; matchedIds: string[]; truncated: boolean } {
  if (chunks.length === 0 || maxChars <= 0) {
    return { markdown: '', matchedIds: [], truncated: false };
  }

  const parts: string[] = [];
  const matchedIds: string[] = [];
  let remaining = maxChars;
  let truncated = false;

  for (const chunk of chunks) {
    const header = `### ${chunk.kind}: ${chunk.id}\n`;
    const overhead = parts.length === 0 ? header.length : 2 + header.length;
    if (remaining <= overhead) {
      truncated = true;
      break;
    }

    const bodyBudget = remaining - overhead;
    let body = chunk.markdown;
    if (body.length > bodyBudget) {
      const marker = '\n\n[truncated to knowledge context budget]';
      const sliceLen = Math.max(0, bodyBudget - marker.length);
      body = `${body.slice(0, sliceLen)}${marker}`;
      truncated = true;
    }

    const block = `${header}${body}`;
    parts.push(block);
    matchedIds.push(chunk.id);
    remaining -= (parts.length === 1 ? 0 : 2) + block.length;
    if (truncated) {
      break;
    }
  }

  return {
    markdown: parts.join('\n\n'),
    matchedIds,
    truncated,
  };
}
