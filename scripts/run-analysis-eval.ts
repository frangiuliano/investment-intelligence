/**
 * Analysis quality eval harness (Issue #85).
 *
 * Default: mock mode (deterministic, no API key).
 * Live: npm run eval:analysis -- --live [--ids id1,id2]
 */
import path from 'node:path';
import {
  DEFAULT_LIVE_PASS_THRESHOLD,
  runAnalysisEval,
} from '../src/eval/analysis/run-analysis-eval';
import type { AnalysisEvalReport } from '../src/eval/analysis/types';

function parseArgs(argv: string[]) {
  let mode: 'mock' | 'live' = 'mock';
  let ids: string[] | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--live') {
      mode = 'live';
      continue;
    }
    if (arg === '--mock') {
      mode = 'mock';
      continue;
    }
    if (arg === '--ids') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('--ids requires a comma-separated list of case ids');
      }
      ids = value
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      i += 1;
      continue;
    }
    if (arg.startsWith('-')) {
      throw new Error(`Unknown flag: ${arg}`);
    }
    throw new Error(
      'Usage: npm run eval:analysis -- [--mock|--live] [--ids id1,id2]',
    );
  }

  return { mode, ids };
}

async function main() {
  const { mode, ids } = parseArgs(process.argv.slice(2));
  const fixturesDir = path.resolve(
    process.cwd(),
    'eval/analysis/fixtures',
  );

  const report = await runAnalysisEval({
    fixturesDir,
    mode,
    ids,
    locale: (process.env.APP_LOCALE as 'en' | 'es' | undefined) ?? 'en',
    knowledgeRoot: process.env.KNOWLEDGE_ROOT,
    livePassThreshold: DEFAULT_LIVE_PASS_THRESHOLD,
  });

  printReport(report);

  if (!report.gatePassed) {
    process.exitCode = 1;
  }
}

function printReport(report: AnalysisEvalReport) {
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        mode: report.mode,
        total: report.total,
        passed: report.passed,
        failed: report.failed,
        passRate: Number(report.passRate.toFixed(4)),
        gateThreshold: report.gateThreshold,
        gatePassed: report.gatePassed,
        cases: report.cases.map((result) => ({
          id: result.id,
          passed: result.passed,
          error: result.error ?? null,
          knowledgeVersion: result.knowledgeVersion ?? null,
          fields: result.fieldScores.map((field) => ({
            field: field.field,
            passed: field.passed,
            expected: field.expected,
            actual: field.actual,
          })),
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
