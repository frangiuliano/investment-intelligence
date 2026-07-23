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

  it('should run mock eval without API key and pass the gate', async () => {
    const previousKey = process.env.GEMINI_API_KEY_FINANCE;
    delete process.env.GEMINI_API_KEY_FINANCE;

    try {
      const report = await runAnalysisEval({
        fixturesDir: FIXTURES_DIR,
        mode: 'mock',
        ids: ['001-aapl-earnings-beat', '007-macro-no-ticker'],
      });

      expect(report.mode).toBe('mock');
      expect(report.total).toBe(2);
      expect(report.passed).toBe(2);
      expect(report.gatePassed).toBe(true);
      expect(report.cases.every((result) => result.error == null)).toBe(true);
    } finally {
      if (previousKey !== undefined) {
        process.env.GEMINI_API_KEY_FINANCE = previousKey;
      }
    }
  });

  it('should allow injecting a custom mock LlmClient', async () => {
    const cases = await loadAnalysisGoldFixtures(FIXTURES_DIR);
    const subset = cases.filter((goldCase) => goldCase.id.startsWith('001-'));
    const client = createMockAnalysisLlmClient(
      new Map(subset.map((goldCase) => [goldCase.id, goldCase])),
    );

    const report = await runAnalysisEval(
      {
        fixturesDir: FIXTURES_DIR,
        mode: 'mock',
        ids: subset.map((goldCase) => goldCase.id),
      },
      client,
    );

    expect(report.passed).toBe(subset.length);
  });
});
