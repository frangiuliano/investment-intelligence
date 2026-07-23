import { promises as fs } from 'node:fs';
import path from 'node:path';
import { resolveDocId, writeChunkCache } from './cache';
import { chunkText } from './chunk';
import { extractTextFromSource } from './extract-text';
import { sha256Hex } from './hash';
import {
  ensurePlaybookListed,
  readManifest,
  shouldBumpPatchOnApply,
  upsertManifestSource,
  writeManifest,
} from './manifest';
import { assertPlaybookTemplate } from './playbook-template';
import type { PlaybookAssetType } from './playbook-template';
import { resolveKnowledgeSourcePath } from './source-path';
import { synthesizePlaybookFromText } from './synthesize-dry-run';

export type PrepareIngestParams = {
  knowledgeRoot: string;
  sourcePath: string;
  target: PlaybookAssetType;
};

export async function prepareKnowledgeIngest(params: PrepareIngestParams) {
  const resolved = await resolveKnowledgeSourcePath({
    knowledgeRoot: params.knowledgeRoot,
    sourcePath: params.sourcePath,
  });
  const extracted = await extractTextFromSource(resolved.absolutePath);
  const sourceHash = sha256Hex(extracted.text);
  const docId = resolveDocId(resolved.relativeToKnowledge, sourceHash);
  const chunks = chunkText(extracted.text);

  const result = await writeChunkCache({
    knowledgeRoot: params.knowledgeRoot,
    docId,
    sourcePath: resolved.relativeToKnowledge,
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
    sourceRelative: resolved.relativeToKnowledge,
  };
}

export type DryRunIngestParams = PrepareIngestParams & {
  apply?: boolean;
};

export async function dryRunKnowledgeIngest(params: DryRunIngestParams) {
  const prepared = await prepareKnowledgeIngest(params);
  const sourceRelative = prepared.sourceRelative;

  let manifest = await readManifest(params.knowledgeRoot);
  let knowledgeVersionForDraft = manifest.knowledgeVersion;
  const { markdown: initialMarkdown } = synthesizePlaybookFromText({
    text: await fs.readFile(path.join(prepared.rawDir, 'source.txt'), 'utf8'),
    target: params.target,
    knowledgeVersion: knowledgeVersionForDraft,
    docId: prepared.docId,
    sourceRelativePath: sourceRelative,
  });

  const missing = assertPlaybookTemplate(initialMarkdown);
  if (missing.length > 0) {
    throw new Error(`Dry-run playbook missing sections: ${missing.join(', ')}`);
  }

  const today = new Date().toISOString().slice(0, 10);
  let appliedPath: string | undefined;
  let markdown = initialMarkdown;

  const sourceEntry = {
    docId: prepared.docId,
    sourceHash: prepared.sourceHash,
    sourcePath: sourceRelative,
    targets: [params.target],
    ingestedAt: today,
  };

  if (params.apply) {
    const bumpPatch = shouldBumpPatchOnApply(
      manifest,
      prepared.docId,
      prepared.sourceHash,
    );
    manifest = upsertManifestSource(manifest, sourceEntry, { bumpPatch });
    knowledgeVersionForDraft = manifest.knowledgeVersion;
    markdown = initialMarkdown.replace(
      /knowledgeVersion: `[^`]+`/,
      `knowledgeVersion: \`${knowledgeVersionForDraft}\``,
    );

    const playbookFile =
      params.target === 'other'
        ? `playbooks/${prepared.docId}.md`
        : `playbooks/${params.target}.md`;
    const absolutePlaybook = path.join(params.knowledgeRoot, playbookFile);
    await fs.writeFile(absolutePlaybook, markdown, 'utf8');
    manifest = ensurePlaybookListed(manifest, {
      id: params.target === 'other' ? prepared.docId : params.target,
      path: playbookFile,
      assetType: params.target,
    });
    appliedPath = playbookFile;
  } else {
    manifest = upsertManifestSource(manifest, sourceEntry);
  }

  const draftPath = path.join(prepared.rawDir, 'playbook.md');
  await fs.writeFile(draftPath, markdown, 'utf8');
  await writeManifest(params.knowledgeRoot, manifest);

  return {
    ...prepared,
    draftPath,
    appliedPath,
    knowledgeVersion: manifest.knowledgeVersion,
    sourceRelative,
  };
}
