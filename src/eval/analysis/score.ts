import type { GeminiAnalysisResult } from '../../analysis/gemini-response';
import type {
  AnalysisCaseResult,
  AnalysisFieldScore,
  AnalysisGoldExpected,
} from './types';

function sortedTickers(tickers: string[]): string[] {
  return [...tickers].map((t) => t.trim().toUpperCase()).sort();
}

function formatTickers(tickers: string[]): string {
  return JSON.stringify(sortedTickers(tickers));
}

export function scoreAnalysisPrediction(
  caseId: string,
  expected: AnalysisGoldExpected,
  actual: Pick<
    GeminiAnalysisResult,
    'tickers' | 'materiality' | 'eventType' | 'sentiment'
  >,
): AnalysisCaseResult {
  const fieldScores: AnalysisFieldScore[] = [
    {
      field: 'tickers',
      expected: formatTickers(expected.tickers),
      actual: formatTickers(actual.tickers),
      passed: formatTickers(expected.tickers) === formatTickers(actual.tickers),
    },
    {
      field: 'materiality',
      expected: expected.materiality,
      actual: actual.materiality,
      passed: expected.materiality === actual.materiality,
    },
    {
      field: 'event_type',
      expected: expected.event_type,
      actual: actual.eventType,
      passed: expected.event_type === actual.eventType,
    },
    {
      field: 'sentiment',
      expected: expected.sentiment,
      actual: actual.sentiment,
      passed: expected.sentiment === actual.sentiment,
    },
  ];

  return {
    id: caseId,
    passed: fieldScores.every((score) => score.passed),
    fieldScores,
  };
}
