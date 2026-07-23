import path from 'node:path';
import { scoreAnalysisPrediction } from './score';
import { loadAnalysisGoldFixtures } from './load-fixtures';
import {
  createMockAnalysisLlmClient,
  runAnalysisEval,
} from './run-analysis-eval';

const FIXTURES_DIR = path.resolve(process.cwd(), 'eval/analysis/fixtures');

describe('analysis eval score', () => {
  it('should pass when hard fields match ignoring ticker order', () => {
    const result = scoreAnalysisPrediction(
      'case-a',
      {
        tickers: ['MSFT', 'AAPL'],
        materiality: 'high',
        event_type: 'earnings',
        sentiment: 'positive',
      },
      {
        tickers: ['AAPL', 'MSFT'],
        materiality: 'high',
        eventType: 'earnings',
        sentiment: 'positive',
      },
    );

    expect(result.passed).toBe(true);
    expect(result.fieldScores.every((field) => field.passed)).toBe(true);
  });

  it('should fail when materiality differs', () => {
    const result = scoreAnalysisPrediction(
      'case-b',
      {
        tickers: ['AAPL'],
        materiality: 'high',
        event_type: 'earnings',
        sentiment: 'positive',
      },
      {
        tickers: ['AAPL'],
        materiality: 'low',
        eventType: 'earnings',
        sentiment: 'positive',
      },
    );

    expect(result.passed).toBe(false);
    expect(
      result.fieldScores.find((field) => field.field === 'materiality')?.passed,
    ).toBe(false);
  });
});

describe('analysis eval fixtures and runner', () => {
  it('should load and validate versioned gold fixtures', async () => {
    const cases = await loadAnalysisGoldFixtures(FIXTURES_DIR);
    expect(cases.length).toBeGreaterThanOrEqual(10);
    expect(cases.length).toBeLessThanOrEqual(30);
    for (const goldCase of cases) {
      expect(goldCase.id.length).toBeGreaterThan(0);
      expect(goldCase.mockModelResponse.summary.length).toBeGreaterThan(0);
      expect(Array.isArray(goldCase.expected.tickers)).toBe(true);
    }
  });

  it('should run full mock eval without API key and pass the gate', async () => {
    const previousKey = process.env.GEMINI_API_KEY_FINANCE;
    delete process.env.GEMINI_API_KEY_FINANCE;

    try {
      const allCases = await loadAnalysisGoldFixtures(FIXTURES_DIR);
      const report = await runAnalysisEval({
        fixturesDir: FIXTURES_DIR,
        mode: 'mock',
      });

      expect(report.mode).toBe('mock');
      expect(report.total).toBe(allCases.length);
      expect(report.passed).toBe(allCases.length);
      expect(report.failed).toBe(0);
      expect(report.gatePassed).toBe(true);
      expect(report.passRate).toBe(1);
      expect(report.cases.every((result) => result.error == null)).toBe(true);
    } finally {
      if (previousKey !== undefined) {
        process.env.GEMINI_API_KEY_FINANCE = previousKey;
      }
    }
  });

  it('should route mock cases out-of-band without polluting the user prompt', async () => {
    const cases = await loadAnalysisGoldFixtures(FIXTURES_DIR);
    const subset = cases.filter((goldCase) => goldCase.id.startsWith('001-'));
    const client = createMockAnalysisLlmClient(
      new Map(subset.map((goldCase) => [goldCase.id, goldCase])),
    );
    const seenUsers: string[] = [];
    const wrappingClient = {
      routeToCase: (caseId: string) => client.routeToCase(caseId),
      completeJson: async (
        request: Parameters<typeof client.completeJson>[0],
      ) => {
        seenUsers.push(request.user);
        return client.completeJson(request);
      },
    };

    const report = await runAnalysisEval(
      {
        fixturesDir: FIXTURES_DIR,
        mode: 'mock',
        ids: subset.map((goldCase) => goldCase.id),
      },
      wrappingClient,
    );

    expect(report.passed).toBe(subset.length);
    expect(seenUsers.length).toBe(subset.length);
    for (const user of seenUsers) {
      expect(user).not.toMatch(/\[eval-case-id:/);
    }
  });
});
