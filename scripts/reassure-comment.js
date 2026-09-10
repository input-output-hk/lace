/*
Builds the sticky PR comment body for the Reassure two-pass job
(docs/plans/reassure-ci-two-pass.md) from .reassure/output.{md,json}.

reassure-compare's own report buries the gated signal: render counts and
removed/added suites trail a per-run stats table that is ~60% of the
report, and GitHub truncates comments at 65536 chars — whatever sits last
is eaten first. This builder leads with the gate verdict and the blocking
sections, drops the per-run stats table (preserved in the run artifact),
and leaves the noise-only duration table last so truncation can only ever
cost noise.

The verdict is derived through reassure-check.js's evaluateComparison so
the comment can never disagree with the gate's actual decision.

Consumed by the "Post results to PR" github-script step in ci.yml.
*/

const { evaluateComparison } = require('./reassure-check.js');

const SHORT_SHA_LENGTH = 9;
const shortSha = sha => sha && `\`${sha.slice(0, SHORT_SHA_LENGTH)}\``;

// Section titles as emitted by @callstack/reassure-compare 1.5.1, reordered
// gate-relevant-first. A title this list doesn't know (newer reassure) is
// kept, placed between the known signal and the noise tail.
const LEAD_SECTIONS = [
  'Render Count Changes',
  'Removed Entries',
  'Added Entries',
  'Significant Changes To Duration',
  'Render Issues',
];
const NOISE_TAIL_SECTION = 'Meaningless Changes To Duration';

// The per-run stats block duplicates the artifact and dwarfs every other
// section; anchored on its summary text so the "Show entries" details of the
// meaningless table survives.
const PER_RUN_STATS_BLOCK =
  /<details>\s*<summary>Show details<\/summary>[\S\s]*?<\/details>\s*/g;

/** Split on H3 headings; index 0 is reassure's pre-heading preamble. */
const splitSections = markdown => {
  const sections = [{ title: undefined, body: [] }];
  for (const line of markdown.split('\n')) {
    if (line.startsWith('### ')) {
      sections.push({ title: line.slice(4).trim(), body: [line] });
    } else {
      sections.at(-1).body.push(line);
    }
  }
  return sections.map(section => ({
    ...section,
    body: section.body.join('\n').trim(),
  }));
};

const orderSections = sections => {
  const byTitle = new Map(
    sections
      .filter(section => section.title !== undefined)
      .map(section => [section.title, section]),
  );
  const lead = LEAD_SECTIONS.filter(title => byTitle.has(title)).map(title => {
    const section = byTitle.get(title);
    byTitle.delete(title);
    return section;
  });
  const noiseTail = byTitle.get(NOISE_TAIL_SECTION);
  byTitle.delete(NOISE_TAIL_SECTION);
  return [...lead, ...byTitle.values(), ...(noiseTail ? [noiseTail] : [])];
};

const verdict = ({ comparison, gateMode, allowRemoved }) => {
  // Mirrors reassure-check.js: an unreadable output.json exits non-zero under
  // REASSURE_GATE=fail, so the verdict must follow the gate here too.
  if (!comparison) {
    const unreadable = 'comparison output unreadable — see the job log';
    return gateMode === 'fail'
      ? `❌ **Render-count gate: failed** — ${unreadable}.`
      : `⚠️ **Render-count gate: not evaluated (report-only)** — ${unreadable}.`;
  }
  const { failed, messages } = evaluateComparison(comparison, { allowRemoved });
  if (!failed) {
    return '✅ **Render-count gate: passed** — no render/function count regressions, no suites removed.';
  }
  const reasons = messages
    .filter(message => message.level === 'error')
    .map(message => `- ${message.text}`)
    .join('\n');
  return gateMode === 'fail'
    ? `❌ **Render-count gate: failed**\n\n${reasons}`
    : '⚠️ **Render-count gate: failed (report-only)** — `REASSURE_GATE` is not' +
        ` \`fail\`, so this does not block yet (rollout stage 1).\n\n${reasons}`;
};

const provenance = ({ comparison, prHeadSha, runUrl, artifactName }) => {
  const lines = [];
  const measured = metadata =>
    metadata?.creationDate ? ` — measured ${metadata.creationDate}` : '';
  const { baseline, current } = comparison?.metadata ?? {};
  if (baseline?.commitHash) {
    lines.push(
      `- **Baseline**: merge-base ${shortSha(baseline.commitHash)}${measured(
        baseline,
      )}`,
    );
  }
  if (current?.commitHash) {
    // In CI the checkout is refs/pull/N/merge, so the measured sha is a
    // synthetic merge commit that exists in no branch — name the PR head too
    // or the numbers are untraceable.
    const head = prHeadSha
      ? `PR head ${shortSha(prHeadSha)} (measured as merge commit ${shortSha(
          current.commitHash,
        )})`
      : shortSha(current.commitHash);
    lines.push(`- **Current**: ${head}${measured(current)}`);
  }
  if (runUrl) {
    const artifact = artifactName ? `artifact \`${artifactName}\` on the ` : '';
    lines.push(
      `- **Per-run measurements**: ${artifact}[workflow run](${runUrl}) (14-day retention)`,
    );
  }
  return lines.join('\n');
};

/**
 * @param {object} input
 * @param {string} input.reportMd reassure-compare's output.md content
 * @param {object} [input.comparison] parsed output.json; omit if unreadable
 * @param {string} [input.gateMode] REASSURE_GATE value ('fail' enforces)
 * @param {boolean} [input.allowRemoved] REASSURE_ALLOW_REMOVED, mirrored so
 *   the verdict matches the gate on intentional suite removals
 * @param {string} [input.prHeadSha] real PR head sha (not the merge ref)
 * @param {string} [input.runUrl] html url of the workflow run
 * @param {string} [input.artifactName] uploaded .reassure artifact name
 * @returns {string} comment body markdown (marker and title added by ci.yml)
 */
const buildReassureComment = ({
  reportMd,
  comparison,
  gateMode,
  allowRemoved = false,
  prHeadSha,
  runUrl,
  artifactName,
}) => {
  const sections = splitSections(reportMd.replace(PER_RUN_STATS_BLOCK, ''));
  const provenanceBlock = provenance({
    comparison,
    prHeadSha,
    runUrl,
    artifactName,
  });
  // Without metadata the original preamble (minus its H1 — ci.yml adds the
  // title) is the only record of what was measured, so keep it.
  const header = comparison?.metadata
    ? provenanceBlock
    : [sections[0].body.replace(/^# .*$/m, '').trim(), provenanceBlock].filter(
        Boolean,
      );
  return [
    verdict({ comparison, gateMode, allowRemoved }),
    'Only render/function **count** regressions and removed suites block; ' +
      'duration changes and render issues are warn-only (hosted-runner noise).',
    ...[header].flat(),
    ...orderSections(sections).map(section => section.body),
  ]
    .filter(Boolean)
    .join('\n\n');
};

module.exports = buildReassureComment;
