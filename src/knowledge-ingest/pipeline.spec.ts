import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveDocId, writeChunkCache } from './cache';
import { chunkText } from './chunk';
import { sha256Hex } from './hash';
import {
  bumpPatchVersion,
  ensurePlaybookListed,
  shouldBumpPatchOnApply,
  upsertManifestSource,
} from './manifest';
import { assertPlaybookTemplate } from './playbook-template';
import { dryRunKnowledgeIngest, prepareKnowledgeIngest } from './pipeline';
import { synthesizePlaybookFromText } from './synthesize-dry-run';

describe('hash and cache', () => {
  it('should resolve a stable docId from basename + hash', () => {
    const hash = sha256Hex('abc');
    expect(resolveDocId('/tmp/Sample Equity.txt', hash)).toBe(
      `sample-equity-${hash.slice(0, 8)}`,
    );
  });

  it('should skip rewriting unchanged chunk files on re-run', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ki-cache-'));
    const knowledgeRoot = path.join(tmp, 'knowledge');
    await fs.mkdir(knowledgeRoot, { recursive: true });
    const text = 'Cache me once then hit.';
    const chunks = chunkText(text);
    const sourceHash = sha256Hex(text);

    const first = await writeChunkCache({
      knowledgeRoot,
      docId: 'doc-a',
      sourcePath: 'sources/fixtures/a.txt',
      sourceText: text,
      sourceHash,
      chunks,
      target: 'equity',
    });
    expect(first.cacheMisses).toBe(1);
    expect(first.cacheHits).toBe(0);

    const second = await writeChunkCache({
      knowledgeRoot,
      docId: 'doc-a',
      sourcePath: 'sources/fixtures/a.txt',
      sourceText: text,
      sourceHash,
      chunks,
      target: 'equity',
    });
    expect(second.cacheHits).toBe(1);
    expect(second.cacheMisses).toBe(0);
  });
});

describe('playbook template and dry-run synthesize', () => {
  it('should include all required sections', () => {
    const { markdown } = synthesizePlaybookFromText({
      text: 'Example Tech (EXTECH) earnings and raised guidance',
      target: 'equity',
      knowledgeVersion: '0.1.0',
      docId: 'fixture-1',
      sourceRelativePath: 'sources/fixtures/sample.txt',
    });
    expect(assertPlaybookTemplate(markdown)).toEqual([]);
    expect(markdown).toContain('## Always check');
    expect(markdown).toContain('EXTECH');
  });
});

describe('manifest helpers', () => {
  it('should bump patch version', () => {
    expect(bumpPatchVersion('0.1.0')).toBe('0.1.1');
  });

  it('should merge targets on upsert of the same docId', () => {
    const base = {
      knowledgeVersion: '0.1.0',
      updatedAt: '2026-07-22',
      playbooks: [],
      rubrics: [],
      sources: [],
    };
    const first = upsertManifestSource(base, {
      docId: 'd1',
      sourceHash: 'abc',
      sourcePath: 'sources/fixtures/a.txt',
      targets: ['equity'],
      ingestedAt: '2026-07-22',
    });
    const second = upsertManifestSource(first, {
      docId: 'd1',
      sourceHash: 'abc',
      sourcePath: 'sources/fixtures/a.txt',
      targets: ['cedear'],
      ingestedAt: '2026-07-23',
    });
    expect(second.sources).toHaveLength(1);
    expect(second.sources[0].targets).toEqual(['cedear', 'equity']);
  });

  it('should bump patch on apply only when source hash changes', () => {
    const withSource = {
      knowledgeVersion: '0.1.0',
      updatedAt: '2026-07-22',
      playbooks: [],
      rubrics: [],
      sources: [
        {
          docId: 'd1',
          sourceHash: 'abc',
          sourcePath: 'sources/fixtures/a.txt',
          targets: ['equity'],
          ingestedAt: '2026-07-22',
        },
      ],
    };
    expect(shouldBumpPatchOnApply(withSource, 'd1', 'abc')).toBe(false);
    expect(shouldBumpPatchOnApply(withSource, 'd1', 'def')).toBe(true);
    expect(shouldBumpPatchOnApply(withSource, 'new', 'abc')).toBe(true);
  });

  it('should upsert source and list playbook', () => {
    const base = {
      knowledgeVersion: '0.1.0',
      updatedAt: '2026-07-22',
      playbooks: [],
      rubrics: [],
      sources: [],
    };
    const withSource = upsertManifestSource(base, {
      docId: 'd1',
      sourceHash: 'abc',
      sourcePath: 'sources/fixtures/a.txt',
      targets: ['equity'],
      ingestedAt: '2026-07-22',
    });
    expect(withSource.sources).toHaveLength(1);
    const withPlaybook = ensurePlaybookListed(withSource, {
      id: 'equity',
      path: 'playbooks/equity.md',
      assetType: 'equity',
    });
    expect(withPlaybook.playbooks[0].id).toBe('equity');
  });
});

describe('pipeline dry-run against fixture', () => {
  it('should prepare chunks, write draft playbook, update manifest, and cache on re-run', async () => {
    const repoFixture = path.join(
      process.cwd(),
      'knowledge/sources/fixtures/sample-equity-earnings.txt',
    );
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ki-pipe-'));
    const knowledgeRoot = path.join(tmp, 'knowledge');
    await fs.cp(path.join(process.cwd(), 'knowledge'), knowledgeRoot, {
      recursive: true,
    });
    await fs.rm(path.join(knowledgeRoot, 'raw'), {
      recursive: true,
      force: true,
    });
    await fs.mkdir(path.join(knowledgeRoot, 'raw'), { recursive: true });

    const manifestPath = path.join(knowledgeRoot, 'manifest.json');
    const manifestSeed = JSON.parse(
      await fs.readFile(manifestPath, 'utf8'),
    ) as { knowledgeVersion: string; sources: unknown[] };
    const expectedVersion = bumpPatchVersion(manifestSeed.knowledgeVersion);
    manifestSeed.sources = [];
    await fs.writeFile(
      manifestPath,
      `${JSON.stringify(manifestSeed, null, 2)}\n`,
      'utf8',
    );

    const relativeFixture = path.join(
      knowledgeRoot,
      'sources/fixtures/sample-equity-earnings.txt',
    );
    await fs.copyFile(repoFixture, relativeFixture);

    const first = await dryRunKnowledgeIngest({
      knowledgeRoot,
      sourcePath: relativeFixture,
      target: 'equity',
      apply: true,
    });

    expect(first.chunkCount).toBeGreaterThanOrEqual(1);
    expect(first.cacheMisses).toBeGreaterThanOrEqual(1);
    expect(first.appliedPath).toBe('playbooks/equity.md');
    expect(first.sourceRelative).toBe(
      'sources/fixtures/sample-equity-earnings.txt',
    );

    const draft = await fs.readFile(first.draftPath, 'utf8');
    expect(assertPlaybookTemplate(draft)).toEqual([]);
    expect(draft).toContain(`knowledgeVersion: \`${expectedVersion}\``);

    const meta = JSON.parse(
      await fs.readFile(path.join(first.rawDir, 'meta.json'), 'utf8'),
    ) as { sourcePath: string };
    expect(meta.sourcePath).toBe('sources/fixtures/sample-equity-earnings.txt');
    expect(meta.sourcePath.startsWith('/')).toBe(false);

    const manifest = JSON.parse(
      await fs.readFile(path.join(knowledgeRoot, 'manifest.json'), 'utf8'),
    ) as { knowledgeVersion: string; sources: unknown[] };
    expect(manifest.knowledgeVersion).toBe(expectedVersion);
    expect(manifest.sources).toHaveLength(1);

    const playbook = await fs.readFile(
      path.join(knowledgeRoot, 'playbooks/equity.md'),
      'utf8',
    );
    expect(playbook).toContain('## source_refs');
    expect(playbook).toContain(`knowledgeVersion: \`${expectedVersion}\``);

    const reapply = await dryRunKnowledgeIngest({
      knowledgeRoot,
      sourcePath: relativeFixture,
      target: 'equity',
      apply: true,
    });
    expect(reapply.knowledgeVersion).toBe(expectedVersion);

    const secondPrepare = await prepareKnowledgeIngest({
      knowledgeRoot,
      sourcePath: relativeFixture,
      target: 'equity',
    });
    expect(secondPrepare.cacheHits).toBeGreaterThanOrEqual(1);
    expect(secondPrepare.cacheMisses).toBe(0);
  });

  it('should reject prepare outside knowledge/sources/', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ki-pipe-out-'));
    const knowledgeRoot = path.join(tmp, 'knowledge');
    await fs.cp(path.join(process.cwd(), 'knowledge'), knowledgeRoot, {
      recursive: true,
    });
    const outside = path.join(tmp, 'outside.txt');
    await fs.writeFile(outside, 'nope\n', 'utf8');

    await expect(
      prepareKnowledgeIngest({
        knowledgeRoot,
        sourcePath: outside,
        target: 'equity',
      }),
    ).rejects.toThrow(/must resolve under knowledge\/sources/);
  });
});
