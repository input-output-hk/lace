/**
 * Unit tests for the PR-comment builder of this package's perf island
 * (scripts/reassure-comment.js). Lives here for the same reason as
 * reassure-check.test.ts: ui-toolkit owns the only island, and a root-script
 * change marks every project affected, so these run on any edit.
 *
 * Fixtures mirror @callstack/reassure-compare 1.5.1's output.md/output.json.
 */
import { describe, expect, it } from 'vitest';

type BuildReassureComment = (input: {
  reportMd: string;
  comparison?: Record<string, unknown>;
  gateMode?: string;
  allowRemoved?: boolean;
  prHeadSha?: string;
  runUrl?: string;
  artifactName?: string;
}) => string;

// The builder is a plain CommonJS script (ci.yml requires it from a
// github-script step), so it is required rather than imported.
const buildReassureComment =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../../../../scripts/reassure-comment.js') as BuildReassureComment;

const MERGE_SHA = '6b56cd17fb90b0d05a683f0a3e58c1556225d093';
const BASELINE_SHA = '4d6cbefa028a1f325838ce4eee3590bc722aa756';
const PR_HEAD_SHA = 'a40f3faa7708674de683ba4c0f1126f1ba768597';

const reportMd = `# Performance Comparison Report

- **Current**: HEAD (${MERGE_SHA}) - 2026-08-07 00:20:02Z
- **Baseline**: HEAD (${BASELINE_SHA}) - 2026-08-07 00:15:28Z

### Significant Changes To Duration

*There are no entries*

### Meaningless Changes To Duration

<details>
<summary>Show entries</summary>

| Name | Type | Duration | Count |
| ---- | ---- | -------- | ----- |
| SearchBar | render | 10.3 ms → 10.2 ms | 7 → 7 |

</details>

<details>
<summary>Show details</summary>

| per-run stats table |

</details>

### Render Count Changes

*There are no entries*

### Render Issues

| Name | Initial Updates | Redundant Updates |
| ---- | --------------- | ----------------- |
| TokenItem | 1 🔴 | 2 (2, 3) 🔴 |

### Added Entries

*There are no entries*

### Removed Entries

*There are no entries*
`;

const comparison = {
  metadata: {
    current: { commitHash: MERGE_SHA, creationDate: '2026-08-07T00:20:02Z' },
    baseline: {
      commitHash: BASELINE_SHA,
      creationDate: '2026-08-07T00:15:28Z',
    },
  },
};

describe('buildReassureComment', () => {
  it('leads with a passed verdict and the gate policy', () => {
    const comment = buildReassureComment({ reportMd, comparison });

    expect(comment.startsWith('✅ **Render-count gate: passed**')).toBe(true);
    expect(comment).toContain(
      'duration changes and render issues are warn-only',
    );
  });

  it('leads with a blocking verdict and its reasons when the gate is enforced', () => {
    const comment = buildReassureComment({
      reportMd,
      comparison: {
        ...comparison,
        countChanged: [
          {
            name: 'SearchBar — type',
            countDiff: 1,
            baseline: { meanCount: 7 },
            current: { meanCount: 8 },
          },
        ],
      },
      gateMode: 'fail',
    });

    expect(comment.startsWith('❌ **Render-count gate: failed**')).toBe(true);
    expect(comment).toContain(
      'render count regression: "SearchBar — type" 7 → 8',
    );
  });

  it('marks a failed report-only run as not blocking', () => {
    const comment = buildReassureComment({
      reportMd,
      comparison: { ...comparison, removed: [{ name: 'PoolCard × 50' }] },
      gateMode: 'warn',
    });

    expect(comment).toContain('failed (report-only)');
    expect(comment).toContain('rollout stage 1');
  });

  it('mirrors REASSURE_ALLOW_REMOVED so the verdict matches the gate', () => {
    const comment = buildReassureComment({
      reportMd,
      comparison: { ...comparison, removed: [{ name: 'PoolCard × 50' }] },
      allowRemoved: true,
    });

    expect(comment).toContain('✅ **Render-count gate: passed**');
  });

  it('reports an unreadable comparison but still posts the report', () => {
    const comment = buildReassureComment({ reportMd, gateMode: 'warn' });

    expect(comment).toContain('not evaluated (report-only)');
    expect(comment).toContain('comparison output unreadable');
    expect(comment).toContain('### Render Count Changes');
  });

  it('fails the verdict on an unreadable comparison when the gate is enforced', () => {
    // reassure-check.js exits non-zero here, so a soft warning would have the
    // comment disagree with a red job.
    const comment = buildReassureComment({ reportMd, gateMode: 'fail' });

    expect(comment.startsWith('❌ **Render-count gate: failed**')).toBe(true);
    expect(comment).toContain('comparison output unreadable');
  });

  it('orders gated sections before the meaningless-duration noise', () => {
    const comment = buildReassureComment({ reportMd, comparison });

    const positions = [
      '### Render Count Changes',
      '### Removed Entries',
      '### Added Entries',
      '### Significant Changes To Duration',
      '### Render Issues',
      '### Meaningless Changes To Duration',
    ].map(heading => comment.indexOf(heading));

    expect(positions.every(index => index >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('keeps a section it does not know about', () => {
    const comment = buildReassureComment({
      reportMd: `${reportMd}\n### Brand New Section\n\nfuture reassure output\n`,
      comparison,
    });

    expect(comment).toContain('### Brand New Section');
    expect(comment.indexOf('### Brand New Section')).toBeLessThan(
      comment.indexOf('### Meaningless Changes To Duration'),
    );
  });

  it('drops the per-run stats block but keeps the entries table', () => {
    const comment = buildReassureComment({ reportMd, comparison });

    expect(comment).not.toContain('Show details');
    expect(comment).not.toContain('per-run stats table');
    expect(comment).toContain('Show entries');
  });

  it('names the PR head, merge commit and merge-base instead of "HEAD"', () => {
    const comment = buildReassureComment({
      reportMd,
      comparison,
      prHeadSha: PR_HEAD_SHA,
    });

    expect(comment).toContain('**Baseline**: merge-base `4d6cbefa0`');
    expect(comment).toContain('PR head `a40f3faa7`');
    expect(comment).toContain('measured as merge commit `6b56cd17f`');
    expect(comment).not.toContain(`HEAD (${MERGE_SHA})`);
  });

  it('keeps the original measurement header when metadata is missing', () => {
    const comment = buildReassureComment({ reportMd, comparison: {} });

    expect(comment).toContain(`- **Current**: HEAD (${MERGE_SHA})`);
    expect(comment).not.toContain('# Performance Comparison Report');
  });

  it('links the run and names the artifact holding the raw measurements', () => {
    const comment = buildReassureComment({
      reportMd,
      comparison,
      runUrl: 'https://github.com/o/r/actions/runs/1',
      artifactName: 'reassure-0-42-1',
    });

    expect(comment).toContain(
      'artifact `reassure-0-42-1` on the [workflow run](https://github.com/o/r/actions/runs/1)',
    );
  });
});
