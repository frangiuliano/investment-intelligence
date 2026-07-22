import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveKnowledgeSourcePath } from './source-path';

describe('resolveKnowledgeSourcePath', () => {
  async function setupKnowledgeTree() {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ki-src-'));
    const knowledgeRoot = path.join(tmp, 'knowledge');
    const sources = path.join(knowledgeRoot, 'sources');
    const fixtures = path.join(sources, 'fixtures');
    await fs.mkdir(fixtures, { recursive: true });
    const fixturePath = path.join(fixtures, 'ok.txt');
    await fs.writeFile(fixturePath, 'ok\n', 'utf8');
    return { tmp, knowledgeRoot, sources, fixtures, fixturePath };
  }

  it('should accept paths under knowledge/sources/', async () => {
    const { knowledgeRoot, fixturePath } = await setupKnowledgeTree();
    const resolved = await resolveKnowledgeSourcePath({
      knowledgeRoot,
      sourcePath: fixturePath,
    });
    expect(resolved.relativeToKnowledge).toBe('sources/fixtures/ok.txt');
    expect(resolved.absolutePath).toBe(await fs.realpath(fixturePath));
  });

  it('should reject paths outside knowledge/sources/', async () => {
    const { knowledgeRoot, tmp } = await setupKnowledgeTree();
    const outside = path.join(tmp, 'secret.env');
    await fs.writeFile(outside, 'SECRET=1\n', 'utf8');

    await expect(
      resolveKnowledgeSourcePath({
        knowledgeRoot,
        sourcePath: outside,
      }),
    ).rejects.toThrow(/must resolve under knowledge\/sources/);
  });

  it('should reject symlinks that escape knowledge/sources/', async () => {
    const { knowledgeRoot, fixtures, tmp } = await setupKnowledgeTree();
    const outside = path.join(tmp, 'secret.env');
    await fs.writeFile(outside, 'SECRET=1\n', 'utf8');
    const trap = path.join(fixtures, 'trap.txt');
    await fs.symlink(outside, trap);

    await expect(
      resolveKnowledgeSourcePath({
        knowledgeRoot,
        sourcePath: trap,
      }),
    ).rejects.toThrow(/must resolve under knowledge\/sources/);
  });
});
