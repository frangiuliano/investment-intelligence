import {
  DEFAULT_PLAYBOOK_ASSET_TYPE,
  KnownPlaybookAssetType,
} from './knowledge.constants';
import {
  resolvePlaybookAssetType,
  selectRubricIds,
} from './knowledge-pack.selector';
import { KnowledgeSelectQuery } from './knowledge.types';

describe('knowledge-pack.selector', () => {
  it('prefers explicit assetTypes over text hints', () => {
    const query: KnowledgeSelectQuery = {
      useCase: 'research-brief',
      assetTypes: ['bond', 'other'],
      textHints: 'cedear listing news',
    };
    expect(resolvePlaybookAssetType(query)).toBe('bond');
  });

  it('matches cedear keywords before equity', () => {
    expect(
      resolvePlaybookAssetType({
        useCase: 'news-analysis',
        textHints: 'YPF CEDEAR volume spikes on earnings',
      }),
    ).toBe('cedear');
  });

  it('defaults to equity when no metadata or keywords', () => {
    expect(
      resolvePlaybookAssetType({
        useCase: 'news-analysis',
        textHints: 'Central bank holds rates steady',
      }),
    ).toBe(DEFAULT_PLAYBOOK_ASSET_TYPE satisfies KnownPlaybookAssetType);
  });

  it('selects analysis rubrics and optional stance rubric for briefs', () => {
    expect(selectRubricIds({ useCase: 'news-analysis' })).toEqual([
      'materiality',
      'event-types',
    ]);
    expect(
      selectRubricIds({
        useCase: 'research-brief',
        includeStanceRubric: true,
      }),
    ).toEqual(['stance-invalidation']);
    expect(
      selectRubricIds({
        useCase: 'research-brief',
        includeStanceRubric: false,
      }),
    ).toEqual([]);
  });
});
