import { promises as fs } from 'node:fs';
import path from 'node:path';
import { resolveDocId, writeChunkCache } from './cache';
import { chunkText } from './chunk';
import { extractTextFromSource } from './extract-text';
import { sha256Hex } from './hash';
import {
  ensurePlaybookListed,
  readManifest,
  upsertManifestSource,
  writeManifest,
} from './manifest';
import { assertPlaybookTemplate } from './playbook-template';
import type { PlaybookAssetType } from './playbook-template';
import { synthesizePlaybookFromText } from './synthesize-dry-run';

export type PrepareIngestParams = {
  knowledgeRoot: string;
  sourcePath: string;
  target: PlaybookAssetType;
};

export async function prepareKnowledgeIngest(params: PrepareIngestParams) {
  const extracted = await extractTextFromSource(params.sourcePath);
  const sourceHash = sha256Hex(extracted.text);
  const docId = resolveDocId(params.sourcePath, sourceHash);
  const chunks = chunkText(extracted.text);

  const result = await writeChunkCache({
    knowledgeRoot: params.knowledgeRoot,
    docId,
    sourcePath: extracted.sourcePath,
    sourceText: extracted.text,
    sourceHash,
    chunks,
    target: params.target,
  });

  return {
    ...result,
    format: extracted.format,
    extractor: extracted.extractor,
    chunkCount: chunks.length,
  };
}

export type DryRunIngestParams = PrepareIngestParams & {
  apply?: boolean;
};

export async function dryRunKnowledgeIngest(params: DryRunIngestParams) {
  const prepared = await prepareKnowledgeIngest(params);
  const sourceRelative = path.relative(
    path.dirname(params.knowledgeRoot),
    prepared.sourcePath,
  );
  const knowledgeRelativeSource = path.relative(
    params.knowledgeRoot,
    prepared.sourcePath,
  );

  let manifest = await readManifest(params.knowledgeRoot);
  const { markdown } = synthesizePlaybookFromText({
    text: await fs.readFile(path.join(prepared.rawDir, 'source.txt'), 'utf8'),
    target: params.target,
    knowledgeVersion: manifest.knowledgeVersion,
    docId: prepared.docId,
    sourceRelativePath: knowledgeRelativeSource.startsWith('..')
      ? sourceRelative
      : knowledgeRelativeSource,
  });

  const missing = assertPlaybookTemplate(markdown);
  if (missing.length > 0) {
    throw new Error(`Dry-run playbook missing sections: ${missing.join(', ')}`);
  }

  const draftPath = path.join(prepared.rawDir, 'playbook.md');
  await fs.writeFile(draftPath, markdown, 'utf8');

  const today = new Date().toISOString().slice(0, 10);
  let appliedPath: string | undefined;

  if (params.apply) {
    manifest = upsertManifestSource(
      manifest,
      {
        docId: prepared.docId,
        sourceHash: prepared.sourceHash,
        sourcePath: knowledgeRelativeSource.startsWith('..')
          ? sourceRelative
          : knowledgeRelativeSource,
        targets: [params.target],
        ingestedAt: today,
      },
      { bumpPatch: true },
    );

    const playbookFile =
      params.target === 'other'
        ? `playbooks/${prepared.docId}.md`
        : `playbooks/${params.target}.md`;
    const absolutePlaybook = path.join(params.knowledgeRoot, playbookFile);
    const appliedMarkdown = markdown.replace(
      /knowledgeVersion: `[^`]+`/,
      `knowledgeVersion: \`${manifest.knowledgeVersion}\``,
    );
    await fs.writeFile(absolutePlaybook, appliedMarkdown, 'utf8');
    manifest = ensurePlaybookListed(manifest, {
      id: params.target === 'other' ? prepared.docId : params.target,
      path: playbookFile,
      assetType: params.target,
    });
    appliedPath = playbookFile;
  } else {
    manifest = upsertManifestSource(manifest, {
      docId: prepared.docId,
      sourceHash: prepared.sourceHash,
      sourcePath: knowledgeRelativeSource.startsWith('..')
        ? sourceRelative
        : knowledgeRelativeSource,
      targets: [params.target],
      ingestedAt: today,
    });
  }

  await writeManifest(params.knowledgeRoot, manifest);

  return {
    ...prepared,
    draftPath,
    appliedPath,
    knowledgeVersion: manifest.knowledgeVersion,
    sourceRelative: knowledgeRelativeSource.startsWith('..')
      ? sourceRelative
      : knowledgeRelativeSource,
  };
}
