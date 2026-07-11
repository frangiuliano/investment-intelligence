#!/usr/bin/env node

/**
 * Reviewer Agent (GitHub Actions mode).
 * Waits for CI green, calls Gemini, posts a PR comment with dedupe marker.
 */

import { readFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const {
  GITHUB_TOKEN,
  GEMINI_API_KEY_REVIEWER,
  GITHUB_REPOSITORY,
  PR_NUMBER,
  PR_HEAD_SHA,
  CI_CHECK_NAME = 'lint · test · build',
  GEMINI_MODEL = 'gemini-3.5-flash',
  WAIT_INTERVAL_SEC = '15',
  WAIT_TIMEOUT_SEC = '900',
} = process.env;

const DEDUPE_PREFIX = '<!-- ai-review-agent:sha=';
const REQUIRED = [
  'GITHUB_TOKEN',
  'GEMINI_API_KEY_REVIEWER',
  'GITHUB_REPOSITORY',
  'PR_NUMBER',
  'PR_HEAD_SHA',
];

for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`Missing required env: ${key}`);
    process.exit(1);
  }
}

const [owner, repo] = GITHUB_REPOSITORY.split('/');
const apiBase = 'https://api.github.com';
const waitIntervalMs = Number(WAIT_INTERVAL_SEC) * 1000;
const waitTimeoutMs = Number(WAIT_TIMEOUT_SEC) * 1000;

function dedupeMarker(sha) {
  return `${DEDUPE_PREFIX}${sha} -->`;
}

async function github(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status} ${path}: ${body}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function getCheckRunsForSha(sha) {
  if (!sha) {
    return [];
  }
  const data = await github(
    `/repos/${owner}/${repo}/commits/${sha}/check-runs?per_page=100`,
  );
  return data.check_runs ?? [];
}

function isLinkedToPr(run, prNumber) {
  return (run.pull_requests ?? []).some(
    (pr) => Number(pr.number) === Number(prNumber),
  );
}

function pickLatestCiCheck(runs, { requirePrLink = false } = {}) {
  const matches = runs.filter((run) => {
    if (run.name !== CI_CHECK_NAME) {
      return false;
    }
    if (requirePrLink && !isLinkedToPr(run, PR_NUMBER)) {
      return false;
    }
    return true;
  });

  if (matches.length === 0) {
    return null;
  }

  return matches.sort(
    (a, b) =>
      new Date(b.started_at || b.completed_at || 0) -
      new Date(a.started_at || a.completed_at || 0),
  )[0];
}

/**
 * Prefer the pull_request workflow check (merge commit SHA = github.sha in CI).
 * When merge_commit_sha exists, never fall back to head — a green push check on
 * the branch must not mask a missing/failing PR CI.
 * Head is only used when there is no merge SHA (e.g. merge conflict).
 */
async function findPrCiCheck() {
  const pr = await github(`/repos/${owner}/${repo}/pulls/${PR_NUMBER}`);
  const mergeSha = pr.merge_commit_sha;
  const headSha = pr.head?.sha ?? PR_HEAD_SHA;

  if (mergeSha) {
    const mergeRuns = await getCheckRunsForSha(mergeSha);
    const fromMerge = pickLatestCiCheck(mergeRuns);
    return {
      check: fromMerge,
      source: fromMerge ? 'merge' : null,
      mergeSha,
      headSha,
    };
  }

  const headRuns = await getCheckRunsForSha(headSha);
  const fromHead = pickLatestCiCheck(headRuns, { requirePrLink: true });
  return {
    check: fromHead,
    source: fromHead ? 'head' : null,
    mergeSha,
    headSha,
  };
}

async function waitForCi() {
  const deadline = Date.now() + waitTimeoutMs;
  let sawCheck = false;

  while (Date.now() < deadline) {
    const { check, source, mergeSha, headSha } = await findPrCiCheck();

    if (!check) {
      console.log(
        `Waiting for check "${CI_CHECK_NAME}" (merge=${mergeSha ?? 'n/a'} head=${headSha})...`,
      );
      await sleep(waitIntervalMs);
      continue;
    }

    sawCheck = true;
    console.log(
      `CI check via ${source} status=${check.status} conclusion=${check.conclusion ?? 'n/a'}`,
    );

    if (check.status !== 'completed') {
      await sleep(waitIntervalMs);
      continue;
    }

    if (check.conclusion === 'success') {
      return { ok: true };
    }

    return {
      ok: false,
      reason: `CI check "${CI_CHECK_NAME}" concluded with ${check.conclusion}`,
    };
  }

  return {
    ok: false,
    reason: sawCheck
      ? `Timed out waiting for CI check "${CI_CHECK_NAME}" to complete`
      : `Timed out waiting for CI check "${CI_CHECK_NAME}" to appear`,
  };
}

const ACTIONS_BOT_LOGINS = new Set([
  'github-actions[bot]',
  'github-actions',
]);

async function findExistingReviewComment() {
  const comments = await github(
    `/repos/${owner}/${repo}/issues/${PR_NUMBER}/comments?per_page=100`,
  );
  const marker = dedupeMarker(PR_HEAD_SHA);
  return (comments ?? []).find(
    (comment) =>
      comment.body?.includes(marker) &&
      ACTIONS_BOT_LOGINS.has(comment.user?.login ?? ''),
  );
}

function extractIssueNumber(title) {
  const match = title.match(/\[Issue\s+#(\d+)\]/i) ?? title.match(/#(\d+)/);
  return match ? Number(match[1]) : null;
}

async function loadIssue(issueNumber) {
  if (!issueNumber) {
    return null;
  }
  try {
    return await github(`/repos/${owner}/${repo}/issues/${issueNumber}`);
  } catch (error) {
    console.warn(`Could not load issue #${issueNumber}: ${error.message}`);
    return null;
  }
}

async function loadPrContext() {
  const pr = await github(`/repos/${owner}/${repo}/pulls/${PR_NUMBER}`);
  const files = await github(
    `/repos/${owner}/${repo}/pulls/${PR_NUMBER}/files?per_page=100`,
  );
  const issueNumber = extractIssueNumber(pr.title);
  const issue = await loadIssue(issueNumber);

  const diffParts = (files ?? []).map((file) => {
    const patch = file.patch
      ? file.patch.slice(0, 4000)
      : '(binary or too large — patch omitted)';
    return `### ${file.filename} (${file.status}, +${file.additions}/-${file.deletions})\n\`\`\`diff\n${patch}\n\`\`\``;
  });

  let diffText = diffParts.join('\n\n');
  const maxDiffChars = 80_000;
  if (diffText.length > maxDiffChars) {
    diffText = `${diffText.slice(0, maxDiffChars)}\n\n[diff truncated]`;
  }

  return { pr, issue, issueNumber, diffText, files };
}

async function callGemini({ systemPrompt, userPrompt }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY_REVIEWER,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini API ${response.status}: ${body}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
    .trim();

  if (!text) {
    throw new Error(`Gemini returned empty response: ${JSON.stringify(data)}`);
  }

  return text;
}

function buildUserPrompt({ pr, issue, issueNumber, diffText, files }) {
  const issueBlock = issue
    ? `#${issue.number}: ${issue.title}\n\n${issue.body ?? '(empty body)'}`
    : issueNumber
      ? `Issue #${issueNumber} could not be loaded.`
      : 'No linked issue number found in PR title.';

  const fileList = (files ?? [])
    .map((f) => `- ${f.filename} (${f.status})`)
    .join('\n');

  return `Modo de ejecución: A — Automático (GitHub Actions).
Skills de Cursor (Bugbot / Security Review) no están disponibles: usá "N/A — modo Actions" en esas secciones.
Firmá solo como Reviewer Agent. No menciones IDE, proveedor de LLM, modelo ni canal de ejecución.
No apruebes auto-merge: el merge es manual.

## Pull Request
- Número: #${PR_NUMBER}
- Título: ${pr.title}
- Autor: ${pr.user?.login ?? 'unknown'}
- Head SHA: ${PR_HEAD_SHA}
- Base: ${pr.base?.ref} ← ${pr.head?.ref}

### Body del PR
${pr.body ?? '(empty)'}

## Issue vinculado
${issueBlock}

## Archivos cambiados
${fileList || '(none)'}

## Diff (puede estar truncado)
${diffText || '(no diff)'}

Emití el veredicto completo en el formato markdown del system prompt.`;
}

async function postComment(body) {
  await github(`/repos/${owner}/${repo}/issues/${PR_NUMBER}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

async function main() {
  console.log(`AI Review for PR #${PR_NUMBER} @ ${PR_HEAD_SHA}`);

  const existing = await findExistingReviewComment();
  if (existing) {
    console.log(
      `Skip: review comment already exists for this SHA (comment id ${existing.id})`,
    );
    return;
  }

  const ci = await waitForCi();
  if (!ci.ok) {
    console.log(`Skip review: ${ci.reason}`);
    console.log('CI is not green — not calling Gemini.');
    return;
  }

  const systemPrompt = readFileSync(
    new URL('../reviewer/prompt.md', import.meta.url),
    'utf8',
  );
  const context = await loadPrContext();
  const userPrompt = buildUserPrompt(context);
  const verdict = await callGemini({ systemPrompt, userPrompt });

  const body = `${dedupeMarker(PR_HEAD_SHA)}

${verdict}

---
_Reviewer Agent_`;

  await postComment(body);
  console.log('Review comment posted.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
