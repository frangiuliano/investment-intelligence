import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { KnowledgePackService } from './knowledge-pack.service';

describe('KnowledgePackService', () => {
  const root = path.join(process.cwd(), 'knowledge');

  function createService(maxChars = 12_000): KnowledgePackService {
    return new KnowledgePackService({
      get: (key: string) => {
        if (key === 'knowledge.root') {
          return root;
        }
        if (key === 'knowledge.maxContextChars') {
          return maxChars;
        }
        return undefined;
      },
    } as unknown as ConfigService);
  }

  it('injects equity playbook and analysis rubrics from the seed pack', async () => {
    const service = createService();
    const result = await service.buildInjection({
      useCase: 'news-analysis',
      textHints: 'Apple reports quarterly earnings',
    });

    expect(result.knowledgeVersion).toBe('0.1.0');
    expect(result.injection).not.toBeNull();
    expect(result.injection?.matchedIds).toEqual(
      expect.arrayContaining(['equity', 'materiality', 'event-types']),
    );
    expect(result.injection?.markdown).toContain('## Always check');
    expect(result.injection?.markdown).toContain('materiality');
  });

  it('selects bond playbook from holding assetTypes for briefs', async () => {
    const service = createService();
    const result = await service.buildInjection({
      useCase: 'research-brief',
      assetTypes: ['bond'],
      includeStanceRubric: true,
    });

    expect(result.injection?.matchedIds).toEqual(
      expect.arrayContaining(['bond', 'stance-invalidation']),
    );
    expect(result.injection?.markdown).toContain('Playbook: Bond');
  });

  it('degrades safely when knowledge root is missing', async () => {
    const service = new KnowledgePackService({
      get: (key: string) => {
        if (key === 'knowledge.root') {
          return path.join(process.cwd(), 'knowledge-does-not-exist');
        }
        if (key === 'knowledge.maxContextChars') {
          return 12_000;
        }
        return undefined;
      },
    } as unknown as ConfigService);

    const result = await service.buildInjection({
      useCase: 'news-analysis',
    });
    expect(result.injection).toBeNull();
    expect(result.knowledgeVersion).toBeNull();
  });

  it('retries loading after a transient missing root becomes available', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'kp-retry-'));
    const missingRoot = path.join(tmp, 'knowledge');
    const service = new KnowledgePackService({
      get: (key: string) => {
        if (key === 'knowledge.root') {
          return missingRoot;
        }
        if (key === 'knowledge.maxContextChars') {
          return 12_000;
        }
        return undefined;
      },
    } as unknown as ConfigService);

    const first = await service.buildInjection({ useCase: 'news-analysis' });
    expect(first.injection).toBeNull();

    await fs.cp(path.join(process.cwd(), 'knowledge'), missingRoot, {
      recursive: true,
    });

    const second = await service.buildInjection({ useCase: 'news-analysis' });
    expect(second.injection).not.toBeNull();
    expect(second.knowledgeVersion).toBe('0.1.0');
  });
});
