import { promises as fs } from 'node:fs';
import path from 'node:path';

export type ManifestSourceEntry = {
  docId: string;
  sourceHash: string;
  sourcePath: string;
  targets: string[];
  ingestedAt: string;
};

export type KnowledgeManifest = {
  knowledgeVersion: string;
  updatedAt: string;
  playbooks: Array<{ id: string; path: string; assetType: string }>;
  rubrics: Array<{ id: string; path: string }>;
  sources: ManifestSourceEntry[];
};

export async function readManifest(
  knowledgeRoot: string,
): Promise<KnowledgeManifest> {
  const manifestPath = path.join(knowledgeRoot, 'manifest.json');
  const raw = await fs.readFile(manifestPath, 'utf8');
  return JSON.parse(raw) as KnowledgeManifest;
}

export async function writeManifest(
  knowledgeRoot: string,
  manifest: KnowledgeManifest,
): Promise<void> {
  const manifestPath = path.join(knowledgeRoot, 'manifest.json');
  await fs.writeFile(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
}

export function upsertManifestSource(
  manifest: KnowledgeManifest,
  entry: ManifestSourceEntry,
  options: { bumpPatch?: boolean } = {},
): KnowledgeManifest {
  const sources = [...(manifest.sources ?? [])];
  const existingIndex = sources.findIndex((s) => s.docId === entry.docId);
  if (existingIndex >= 0) {
    sources[existingIndex] = entry;
  } else {
    sources.push(entry);
  }

  let knowledgeVersion = manifest.knowledgeVersion;
  if (options.bumpPatch) {
    knowledgeVersion = bumpPatchVersion(knowledgeVersion);
  }

  return {
    ...manifest,
    knowledgeVersion,
    updatedAt: entry.ingestedAt,
    sources,
  };
}

export function bumpPatchVersion(version: string): string {
  const parts = version.split('.').map((p) => Number.parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid semver knowledgeVersion: ${version}`);
  }
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
}

export function ensurePlaybookListed(
  manifest: KnowledgeManifest,
  playbook: { id: string; path: string; assetType: string },
): KnowledgeManifest {
  const playbooks = [...manifest.playbooks];
  const idx = playbooks.findIndex((p) => p.id === playbook.id);
  if (idx >= 0) {
    playbooks[idx] = playbook;
  } else {
    playbooks.push(playbook);
  }
  return { ...manifest, playbooks };
}
