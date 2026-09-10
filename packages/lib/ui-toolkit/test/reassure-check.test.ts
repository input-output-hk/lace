/**
 * Unit tests for the CI gate that guards this package's perf island
 * (scripts/reassure-check.js). The script lives at the repo root because CI
 * invokes it per island, but ui-toolkit owns the only island today and is the
 * project whose test target runs it — a root-script change marks every
 * project affected, so these run on any edit to the gate.
 *
 * Fixtures mirror @callstack/reassure-compare 1.5.1's output.json shape.
 */
import { describe, expect, it } from 'vitest';

type Message = { level: 'error' | 'notice' | 'warning'; text: string };
type Verdict = { failed: boolean; messages: Message[] };

type Gate = {
  evaluateComparison: (
    output: Record<string, unknown>,
    options?: { allowRemoved?: boolean },
  ) => Verdict;
};

// The gate is a plain CommonJS script (CI runs it with bare node), so it is
// required rather than imported, and its contract is declared above.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const gate = require('../../../../scripts/reassure-check.js') as Gate;
const { evaluateComparison } = gate;

const comparedEntry = (name: string, baselineCount: number, count: number) => ({
  name,
  countDiff: count - baselineCount,
  baseline: { meanCount: baselineCount, meanDuration: 10 },
  current: { meanCount: count, meanDuration: 10 },
});

const errorsOf = (result: Verdict) =>
  result.messages.filter(message => message.level === 'error');

describe('evaluateComparison', () => {
  it('fails on a render count regression', () => {
    const result = evaluateComparison({
      countChanged: [comparedEntry('SearchBar — type', 7, 8)],
    });

    expect(result.failed).toBe(true);
    expect(errorsOf(result)[0].text).toContain('render count regression');
    expect(errorsOf(result)[0].text).toContain('7 → 8');
  });

  it('passes and reports a count improvement as a notice', () => {
    const result = evaluateComparison({
      countChanged: [comparedEntry('RecipientInput — type', 12, 7)],
    });

    expect(result.failed).toBe(false);
    expect(result.messages).toContainEqual({
      level: 'notice',
      text: 'render count improved: "RecipientInput — type" 12 → 7',
    });
  });

  it('fails when a suite disappears from the comparison', () => {
    const result = evaluateComparison({ removed: [{ name: 'PoolCard × 50' }] });

    expect(result.failed).toBe(true);
    expect(errorsOf(result)[0].text).toContain('no longer measured');
  });

  it('downgrades a removed suite to a warning when allowed', () => {
    const result = evaluateComparison(
      { removed: [{ name: 'PoolCard × 50' }] },
      { allowRemoved: true },
    );

    expect(result.failed).toBe(false);
    expect(result.messages[0].level).toBe('warning');
  });

  it('warns without failing on a new suite that has no baseline', () => {
    const result = evaluateComparison({ added: [{ name: 'NewCard — mount' }] });

    expect(result.failed).toBe(false);
    expect(result.messages).toContainEqual({
      level: 'warning',
      text: 'new suite, no baseline to compare: "NewCard — mount"',
    });
  });

  it('fails when the comparison itself reported errors', () => {
    const result = evaluateComparison({
      errors: ['baseline file is malformed'],
    });

    expect(result.failed).toBe(true);
    expect(errorsOf(result)[0].text).toContain('baseline file is malformed');
  });

  it('never fails on duration changes or render issues', () => {
    const result = evaluateComparison({
      significant: [
        {
          name: 'StakingStatusCard — tick',
          baseline: { meanDuration: 0.9 },
          current: { meanDuration: 1.6 },
        },
      ],
      renderIssues: [{ name: 'TokenItem × 50 — initial render' }],
      warnings: ['suspicious baseline entry'],
    });

    expect(result.failed).toBe(false);
    expect(result.messages.every(message => message.level === 'warning')).toBe(
      true,
    );
  });

  it('aggregates render issues into a single warning', () => {
    const result = evaluateComparison({
      renderIssues: [
        { name: 'TokenItem × 50 — initial render' },
        { name: 'RecipientInput — type' },
        { name: 'AssetsSection — 3 asset rows' },
      ],
    });

    expect(result.failed).toBe(false);
    expect(result.messages).toEqual([
      {
        level: 'warning',
        text: 'render issues (warn-only) in 3 suites — see the "Render Issues" table in the PR comment',
      },
    ]);
  });

  it('treats an empty comparison as a pass', () => {
    expect(evaluateComparison({}).failed).toBe(false);
  });
});
