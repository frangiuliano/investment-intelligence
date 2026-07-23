import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  assembleKnowledgeMarkdown,
  loadKnowledgePackFromDisk,
  readRelativeMarkdown,
} from './knowledge-pack.loader';
import { KnowledgeChunk } from './knowledge.types';
import { appendKnowledgePackToSystemPrompt } from './knowledge-prompt';

describe('assembleKnowledgeMarkdown', () => {
  const playbook: KnowledgeChunk = {
    id: 'equity',
    kind: 'playbook',
    markdown: 'Playbook body with Always check section.',
  };
  const rubric: KnowledgeChunk = {
    id: 'materiality',
    kind: 'rubric',
    markdown: 'Rubric body for materiality.',
  };

  it('includes playbook and rubric under budget', () => {
    const result = assembleKnowledgeMarkdown([playbook, rubric], 10_000);
    expect(result.matchedIds).toEqual(['equity', 'materiality']);
    expect(result.markdown).toContain('### playbook: equity');
    expect(result.markdown).toContain('### rubric: materiality');
    expect(result.truncated).toBe(false);
  });

  it('truncates when over budget', () => {
    const result = assembleKnowledgeMarkdown(
      [
        {
          id: 'equity',
          kind: 'playbook',
          markdown: 'x'.repeat(500),
        },
      ],
      120,
    );
    expect(result.truncated).toBe(true);
    expect(result.markdown).toContain(
      '[truncated to knowledge context budget]',
    );
    expect(result.matchedIds).toEqual(['equity']);
  });
});

describe('appendKnowledgePackToSystemPrompt', () => {
  it('returns baseline prompt when injection is null', () => {
    expect(appendKnowledgePackToSystemPrompt('Base system.', null)).toBe(
      'Base system.',
    );
  });

  it('appends knowledge section with version and matched ids', () => {
    const result = appendKnowledgePackToSystemPrompt('Base system.', {
      knowledgeVersion: '0.1.0',
      matchedIds: ['equity', 'materiality'],
      markdown: '### playbook: equity\nAlways check...',
      truncated: false,
    });
    expect(result).toContain('Base system.');
    expect(result).toContain('knowledgeVersion: 0.1.0');
    expect(result).toContain('matched: equity, materiality');
    expect(result).toContain('### playbook: equity');
  });
});

describe('readRelativeMarkdown / loadKnowledgePackFromDisk', () => {
  async function setupPackTree() {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'kp-load-'));
    const knowledgeRoot = path.join(tmp, 'knowledge');
    const playbooks = path.join(knowledgeRoot, 'playbooks');
    await fs.mkdir(playbooks, { recursive: true });
    await fs.writeFile(
      path.join(playbooks, 'equity.md'),
      '# Playbook: Equity\n\n## Always check\n- ok\n',
      'utf8',
    );
    await fs.writeFile(
      path.join(knowledgeRoot, 'manifest.json'),
      `${JSON.stringify(
        {
          knowledgeVersion: '0.1.0',
          updatedAt: '2026-07-23',
          playbooks: [
            { id: 'equity', path: 'playbooks/equity.md', assetType: 'equity' },
          ],
          rubrics: [],
          sources: [],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    return { tmp, knowledgeRoot, playbooks };
  }

  it('loads playbooks under the pack root', async () => {
    const { knowledgeRoot } = await setupPackTree();
    const pack = await loadKnowledgePackFromDisk(knowledgeRoot);
    expect(pack.knowledgeVersion).toBe('0.1.0');
    expect(pack.playbooksByAssetType.get('equity')?.markdown).toContain(
      'Always check',
    );
  });

  it('rejects symlinks that escape the knowledge root', async () => {
    const { knowledgeRoot, playbooks, tmp } = await setupPackTree();
    const outside = path.join(tmp, 'secret.env');
    await fs.writeFile(outside, 'SECRET=1\n', 'utf8');
    const trap = path.join(playbooks, 'trap.md');
    await fs.symlink(outside, trap);

    const rootReal = await fs.realpath(knowledgeRoot);
    await expect(
      readRelativeMarkdown(rootReal, 'playbooks/trap.md'),
    ).rejects.toThrow(/escapes root|Symlinks/);

    await fs.writeFile(
      path.join(knowledgeRoot, 'manifest.json'),
      `${JSON.stringify(
        {
          knowledgeVersion: '0.1.0',
          updatedAt: '2026-07-23',
          playbooks: [
            { id: 'equity', path: 'playbooks/trap.md', assetType: 'equity' },
          ],
          rubrics: [],
          sources: [],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    await expect(loadKnowledgePackFromDisk(knowledgeRoot)).rejects.toThrow(
      /escapes root|Symlinks/,
    );
  });
});
