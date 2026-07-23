import { assembleKnowledgeMarkdown } from './knowledge-pack.loader';
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
