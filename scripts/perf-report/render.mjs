/**
 * Nightly perf-report renderer: reads the dated JSONs collect.mjs produced
 * and writes the report — index.html (the page), summary.md (the digest for
 * the run summary / Slack) and gaps.flag when any source came back empty, so
 * the workflow can fail loudly (a night with no data is an alert, not a
 * footnote).
 *
 * Statistics come from the shared stats.mjs: medians and a
 * bootstrap 95% CI of the difference — never bare means. Percentile of
 * record: p75, always split by OS.
 *
 * Usage: node scripts/perf-report/render.mjs --history data/ --out out/
 *        [--web-verdict perf-web-startup.json]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { median, judgePair, quantile, seededRandom } from './stats.mjs';
import { NEXT, V2, OS_NAMES, SCHEMA_VERSION } from './registry.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const argValue = flag => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
};
const HISTORY_DIR = argValue('--history') ?? 'data';
const OUT_DIR = argValue('--out') ?? 'out';
const WEB_VERDICT_FILE = argValue('--web-verdict');
const TREND_DAYS = 14;

const days = fs
  .readdirSync(HISTORY_DIR)
  .filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
  .sort()
  .slice(-TREND_DAYS)
  .map(f => JSON.parse(fs.readFileSync(path.join(HISTORY_DIR, f), 'utf8')));
if (days.length === 0) throw new Error(`no dated JSONs in ${HISTORY_DIR}`);
for (const d of days)
  if (d.schema !== SCHEMA_VERSION)
    throw new Error(
      `history file for ${d.date} has schema ${d.schema}, expected ${SCHEMA_VERSION} — collect and render disagree`,
    );
const latest = days[days.length - 1];
// Seeded by report date: re-rendering the same history must reproduce the
// same CIs and verdicts (an unseeded bootstrap flips boundary verdicts).
const random = seededRandom(latest.date);

const fmt = (v, digits = 0) =>
  v == null || Number.isNaN(v) ? '—' : Number(v).toFixed(digits);
const ms = v => (v == null ? '—' : `${fmt(v)} ms`);

// ── Readiness: next vs v2, controlled runs only ─────────────────────────────
const readinessFor = op =>
  OS_NAMES.map(os => {
    const next =
      latest.sentry.mobileNightly[NEXT.sentry]?.[op]?.[os]?.samples ?? [];
    const v2 =
      latest.sentry.mobileNightly[V2.sentry]?.[op]?.[os]?.samples ?? [];
    const pair =
      next.length && v2.length
        ? judgePair({ a: next, b: v2, random })
        : undefined;
    return { os, next, v2, pair };
  });
const readiness = readinessFor('app.start.cold');
// The portfolio journey's boundary: TimeToFullDisplay on the portfolio,
// emitted by both generations. Same comparison discipline as cold start.
const ttfdReadiness = readinessFor('ui.load.full_display');

// Weekly verdict: n=5 per night makes wide CIs, so many nightly verdicts are
// honestly inconclusive. Pooling the last 7 days (~25 samples per side)
// resolves differences the single night cannot. Pooled across that week's
// releases — valid while nightly builds drift slowly; when the weekly and the
// nightly verdicts disagree, the per-app trend is what localises the shift.
const WEEK_DAYS = 7;
const pooledSamples = (app, os) =>
  days
    .slice(-WEEK_DAYS)
    .flatMap(
      d =>
        d.sentry.mobileNightly?.[app]?.['app.start.cold']?.[os]?.samples ?? [],
    );
const weekly = OS_NAMES.map(os => {
  const next = pooledSamples(NEXT.sentry, os);
  const v2 = pooledSamples(V2.sentry, os);
  return {
    os,
    next,
    v2,
    pair:
      next.length >= 3 && v2.length >= 3
        ? judgePair({ a: next, b: v2, random })
        : undefined,
  };
});

// BrowserStack side-by-side (medians across the night's sessions)
const bsMetric = (cell, metric) =>
  median((cell?.sessions ?? []).map(s => s[metric]));
const BS_METRICS = [
  ['screen_load_ms', 'screen_load (ms)'],
  ['mem_avg', 'mem avg (MB)'],
  ['cpu_avg', 'cpu avg (%)'],
  ['slow_frames_pct', 'slow frames (%)'],
  ['app_size', 'app size (MB)'],
];
// `namespace` mirrors collect.mjs's BS_JOURNEYS values: '' = app-start cells
// (legacy keys), 'portfolio/' = the portfolio-journey cells.
const bsRowsFor = namespace =>
  ['android', 'ios'].map(platform => ({
    platform,
    metrics: BS_METRICS.map(([key, label]) => ({
      label,
      next: bsMetric(
        latest.browserstack[`${namespace}${NEXT.bs}:${platform}`],
        key,
      ),
      v2: bsMetric(
        latest.browserstack[`${namespace}${V2.bs}:${platform}`],
        key,
      ),
    })),
  }));
const bsRows = bsRowsFor('');
const bsPortfolioRows = bsRowsFor('portfolio/');
const hasPortfolioBsData = bsPortfolioRows.some(({ metrics }) =>
  metrics.some(m => m.next != null || m.v2 != null),
);

// ── Trend: each app against its own history (the primary view) ─────────────
const TREND_OPS = [
  ['app.start.cold', 'cold start'],
  ['ui.load.full_display', 'portfolio TTFD'],
];
const trendRows = [];
for (const app of [NEXT.sentry, V2.sentry])
  for (const os of OS_NAMES)
    for (const [op, opLabel] of TREND_OPS) {
      const points = days.map(d => {
        const samples =
          d.sentry.mobileNightly?.[app]?.[op]?.[os]?.samples ?? [];
        return {
          date: d.date,
          p75: quantile(samples, 0.75),
          med: median(samples),
          n: samples.length,
        };
      });
      if (points.some(p => p.n > 0))
        trendRows.push({ app, os, opLabel, points });
    }

const prodTrend = days.map(d => ({
  date: d.date,
  rows: d.sentry.mobileProduction?.[V2.sentry] ?? [],
}));

// ── Warnings: mechanical checks that flag, not fail (gaps are what fail) ───
// · Regression band: today's p75 above EVERY prior night's p75 (needs ≥3
//   prior nights — below that the band itself is noise).
// · Shrunken sample: a cell reported data but n < 3 — medians and verdicts
//   built on it are unreliable tonight.
// · Mute cell: no samples today for a cell that had them before — catches a
//   single OS going quiet, which the per-app gap check cannot see.
const warnings = [];
for (const { app, os, opLabel, points } of trendRows) {
  const cell = `${app} ${os} (${opLabel})`;
  const today = points[points.length - 1];
  const prior = points.slice(0, -1).filter(p => p.n > 0);
  if (today?.n > 0 && prior.length >= 3) {
    const bandMax = Math.max(...prior.map(p => p.p75));
    if (today.p75 > bandMax)
      warnings.push(
        `Possible regression: ${cell} — p75 ${fmt(
          today.p75,
        )} ms today, above the max of the previous ${
          prior.length
        } nights (${fmt(bandMax)} ms)`,
      );
  }
  if (today?.n > 0 && today.n < 3)
    warnings.push(
      `Shrunken sample: ${cell} with n=${today.n} (<3) — medians and verdicts unreliable tonight`,
    );
  if (today?.n === 0 && prior.length >= 1)
    warnings.push(
      `Mute cell: ${cell} with no samples today (had data on previous nights)`,
    );
}
for (const [cell, data] of Object.entries(latest.browserstack ?? {}))
  if (data.sessions.length > 0 && data.sessions.length < 3)
    warnings.push(
      `Shrunken sample: BrowserStack ${cell} with ${data.sessions.length} session(s) (<3)`,
    );

// ── Web Vitals (per project:environment, latest night) ─────────────────────
const webVitalsRows = Object.entries(latest.sentry.web ?? {}).filter(
  ([, v]) => v && v['count()'] > 0,
);

// ── RC: release-over-release (14d window; absence is normal, not a gap) ────
const rc = latest.sentry.mobileRC?.[NEXT.sentry] ?? {};
const rcCrashFree = new Map(
  (rc.crashFree ?? []).map(c => [c.release, c.crashFreeRate]),
);
const rcRows = (rc.releases ?? []).map(r => ({
  release: r.release,
  os: r['os.name'],
  n: r['count()'],
  p50: r['p50(span.duration)'],
  p75: r['p75(span.duration)'],
  p95: r['p95(span.duration)'],
  crashFree: rcCrashFree.get(r.release),
}));

// ── Web verdict from the harness run, when the artifact is available ───────
// Asking for a verdict (--web-verdict) that is not there is a gap, same as an
// empty Sentry source: the nightly downloads only a same-day artifact, so an
// absent file means tonight's web comparison failed or never ran.
let webPairs = [];
let webVerdictMissing = false;
if (WEB_VERDICT_FILE && fs.existsSync(WEB_VERDICT_FILE)) {
  const walk = node => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object') {
      if (node.verdict && (node.ciLo != null || node.lo != null))
        webPairs.push(node);
      Object.values(node).forEach(walk);
    }
  };
  walk(JSON.parse(fs.readFileSync(WEB_VERDICT_FILE, 'utf8')));
} else if (WEB_VERDICT_FILE) {
  webVerdictMissing = true;
}

const gaps = [...(latest.gaps ?? [])];
if (webVerdictMissing)
  gaps.push('Web: no harness verdict tonight (perf-nightly-web-startup)');

// ── summary.md ──────────────────────────────────────────────────────────────
const lines = [`## Perf nightly — ${latest.date}`, ''];
if (gaps.length) {
  lines.push(`### ⚠️ ${gaps.length} source(s) with no data`, '');
  for (const gap of gaps) lines.push(`- ${gap}`);
  lines.push('');
}
if (warnings.length) {
  lines.push(`### ⚠️ Warnings (${warnings.length})`, '');
  for (const warning of warnings) lines.push(`- ${warning}`);
  lines.push('');
}
const readinessLine = ({ os, next, v2, pair }) => {
  const detail = pair
    ? `median next ${fmt(pair.medianA)} ms vs v2 ${fmt(
        pair.medianB,
      )} ms · Δ ${fmt(pair.diff)} ms, CI95 [${fmt(pair.ciLo)}, ${fmt(
        pair.ciHi,
      )}] → **${pair.verdict}**`
    : `next n=${next.length} (p75 ${ms(quantile(next, 0.75))}) · v2 n=${
        v2.length
      } — no comparison (one side missing)`;
  return `- **${os}**: ${detail}`;
};
lines.push('### Mobile readiness: lace-next vs v2 (cold start, nightly)', '');
for (const row of readiness) {
  if (!row.next.length && !row.v2.length) continue;
  lines.push(readinessLine(row));
}
const ttfdWithData = ttfdReadiness.filter(r => r.next.length || r.v2.length);
if (ttfdWithData.length) {
  lines.push('', '### Portfolio TTFD: lace-next vs v2 (journey, nightly)', '');
  for (const row of ttfdWithData) lines.push(readinessLine(row));
}
const weeklyWithPair = weekly.filter(w => w.pair);
if (weeklyWithPair.length) {
  lines.push(
    '',
    `### Weekly verdict (pooled samples, last ${WEEK_DAYS} days)`,
    '',
  );
  for (const { os, pair } of weeklyWithPair)
    lines.push(
      `- **${os}**: median next ${fmt(pair.medianA)} ms vs v2 ${fmt(
        pair.medianB,
      )} ms (n=${pair.samplesA}/${pair.samplesB}) · Δ ${fmt(
        pair.diff,
      )} ms, CI95 [${fmt(pair.ciLo)}, ${fmt(pair.ciHi)}] → **${pair.verdict}**`,
    );
}
lines.push('', '### v2 production (real users, cold start)', '');
for (const row of prodTrend[prodTrend.length - 1]?.rows ?? [])
  lines.push(
    `- ${row['os.name']}: p50 ${ms(row['p50(span.duration)'])} · p75 ${ms(
      row['p75(span.duration)'],
    )} · p95 ${ms(row['p95(span.duration)'])} (n=${row['count()']})`,
  );
if (webVitalsRows.length) {
  lines.push('', '### Web Vitals (p75, last night)', '');
  for (const [key, v] of webVitalsRows)
    lines.push(
      `- ${key}: FCP ${ms(v['p75(measurements.fcp)'])} · LCP ${ms(
        v['p75(measurements.lcp)'],
      )} · CLS ${fmt(v['p75(measurements.cls)'], 2)} · INP ${ms(
        v['p75(measurements.inp)'],
      )} (n=${v['count()']})`,
    );
}
lines.push('', '### Release candidates lace-next (14d window)', '');
if (rcRows.length === 0) lines.push('- no RCs in the window');
else
  for (const r of rcRows)
    lines.push(
      `- ${r.release} · ${r.os}: p75 ${ms(r.p75)} (n=${r.n})${
        r.crashFree == null
          ? ''
          : ` · crash-free ${(r.crashFree * 100).toFixed(2)}%`
      }`,
    );
if (webPairs.length) {
  lines.push('', '### Web: lace-extension vs lace-next (harness)', '');
  for (const p of webPairs)
    lines.push(
      `- ${p.metric ?? 'startup'}: **${p.verdict}** · Δ ${fmt(
        p.diff,
      )} ms, CI95 [${fmt(p.ciLo ?? p.lo)}, ${fmt(p.ciHi ?? p.hi)}]`,
    );
}
const summary = `${lines.join('\n')}\n`;

// ── index.html ──────────────────────────────────────────────────────────────
const esc = s =>
  String(s).replace(
    /[&<>]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]),
  );
const cellPair = (next, v2, digits = 0) =>
  `<td>${fmt(next, digits)}</td><td>${fmt(v2, digits)}</td>`;

const trendTable = ({ app, os, opLabel, points }) => `
  <h3>${esc(app)} · ${esc(os)} · ${esc(opLabel)}</h3>
  <table><tr><th>date</th><th>p75 (ms)</th><th>median (ms)</th><th>n</th></tr>
  ${points
    .filter(p => p.n > 0)
    .map(
      p =>
        `<tr><td>${p.date}</td><td>${fmt(p.p75)}</td><td>${fmt(
          p.med,
        )}</td><td>${p.n}</td></tr>`,
    )
    .join('')}
  </table>`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Perf nightly — Lace</title>
<style>
  body{font:14px/1.5 -apple-system,system-ui,sans-serif;max-width:960px;margin:2rem auto;padding:0 1rem;color:#1a1a2e}
  table{border-collapse:collapse;margin:.5rem 0 1.5rem}
  th,td{border:1px solid #d0d0e0;padding:.3rem .7rem;text-align:right}
  th:first-child,td:first-child{text-align:left}
  .gap{background:#fff3f3;border:1px solid #e0b0b0;padding:.7rem 1rem;border-radius:6px}
  .verdict-resolved{color:#a33}.verdict-equivalent{color:#2a7}.verdict-inconclusive{color:#888}
  caption{text-align:left;font-weight:600;padding:.3rem 0}
  small{color:#667}
</style></head><body>
<h1>Perf nightly — ${latest.date}</h1>
<p><small>Generated ${esc(latest.generatedAt)} · ${
  latest.lookbackHours
}h window ·
always p75, split by OS · bootstrap 95% CI of the median difference (stats.mjs)</small></p>
${
  gaps.length
    ? `<div class="gap"><strong>⚠️ ${
        gaps.length
      } source(s) with no data tonight</strong><ul>${gaps
        .map(g => `<li>${esc(g)}</li>`)
        .join('')}</ul></div>`
    : ''
}
${
  warnings.length
    ? `<div class="gap" style="background:#fff8ec;border-color:#e0cb95"><strong>⚠️ ${
        warnings.length
      } warning(s)</strong><ul>${warnings
        .map(w => `<li>${esc(w)}</li>`)
        .join('')}</ul></div>`
    : ''
}
<h2>Readiness: lace-next vs v2 (nightly, controlled conditions)</h2>
${(() => {
  const readinessBlock = (rows, metricLabel) =>
    rows
      .filter(r => r.next.length || r.v2.length)
      .map(({ os, next, v2, pair }) => {
        const verdict = pair
          ? `<span class="verdict-${pair.verdict}">${
              pair.verdict
            }</span> · Δ ${fmt(pair.diff)} ms, CI95 [${fmt(pair.ciLo)}, ${fmt(
              pair.ciHi,
            )}]`
          : 'no comparison — one side missing';
        return `<h3>${os} — ${metricLabel} (Sentry)</h3>
    <table><tr><th></th><th>lace-next</th><th>v2</th></tr>
    <tr><td>median (ms)</td>${cellPair(median(next), median(v2))}</tr>
    <tr><td>p75 (ms)</td>${cellPair(
      quantile(next, 0.75),
      quantile(v2, 0.75),
    )}</tr>
    <tr><td>n</td><td>${next.length}</td><td>${v2.length}</td></tr></table>
    <p>${verdict}</p>`;
      })
      .join('');
  return (
    readinessBlock(readiness, 'cold start') +
    readinessBlock(ttfdReadiness, 'portfolio TTFD (journey)')
  );
})()}
${
  weekly.filter(w => w.pair).length
    ? `<h3>Weekly verdict (pooled samples, last ${WEEK_DAYS} days)</h3><ul>${weekly
        .filter(w => w.pair)
        .map(
          ({ os, pair }) =>
            `<li><strong>${os}</strong>: median next ${fmt(
              pair.medianA,
            )} ms vs v2 ${fmt(pair.medianB)} ms (n=${pair.samplesA}/${
              pair.samplesB
            }) · Δ ${fmt(pair.diff)} ms, CI95 [${fmt(pair.ciLo)}, ${fmt(
              pair.ciHi,
            )}] → <span class="verdict-${pair.verdict}">${
              pair.verdict
            }</span></li>`,
        )
        .join('')}</ul>`
    : ''
}
<h3>BrowserStack (medians of the night's sessions)</h3>
${bsRows
  .map(
    ({ platform, metrics }) => `<table><caption>${platform}</caption>
  <tr><th>metric</th><th>lace-next</th><th>v2</th></tr>
  ${metrics
    .map(m => `<tr><td>${m.label}</td>${cellPair(m.next, m.v2, 2)}</tr>`)
    .join('')}
  </table>`,
  )
  .join('')}
${
  hasPortfolioBsData
    ? `<h3>BrowserStack — portfolio journey (session medians)</h3>
${bsPortfolioRows
  .map(
    ({ platform, metrics }) => `<table><caption>${platform}</caption>
  <tr><th>metric</th><th>lace-next</th><th>v2</th></tr>
  ${metrics
    .map(m => `<tr><td>${m.label}</td>${cellPair(m.next, m.v2, 2)}</tr>`)
    .join('')}
  </table>`,
  )
  .join('')}`
    : ''
}
${
  webPairs.length
    ? `<h2>Web: lace-extension vs lace-next (harness, same session)</h2><ul>${webPairs
        .map(
          p =>
            `<li>${esc(p.metric ?? 'startup')}: <span class="verdict-${
              p.verdict
            }">${p.verdict}</span> · Δ ${fmt(p.diff)} ms, CI95 [${fmt(
              p.ciLo ?? p.lo,
            )}, ${fmt(p.ciHi ?? p.hi)}]</li>`,
        )
        .join('')}</ul>`
    : ''
}
${
  webVitalsRows.length
    ? `<h2>Web Vitals (p75, last night)</h2>
<table><tr><th>proyecto:env</th><th>n</th><th>FCP</th><th>LCP</th><th>CLS</th><th>INP</th></tr>
${webVitalsRows
  .map(
    ([key, v]) =>
      `<tr><td>${esc(key)}</td><td>${v['count()']}</td><td>${fmt(
        v['p75(measurements.fcp)'],
      )}</td><td>${fmt(v['p75(measurements.lcp)'])}</td><td>${fmt(
        v['p75(measurements.cls)'],
        2,
      )}</td><td>${fmt(v['p75(measurements.inp)'])}</td></tr>`,
  )
  .join('')}
</table>`
    : ''
}
<h2>Release candidates lace-next (release-over-release, 14d)</h2>
${
  rcRows.length === 0
    ? '<p><small>no RCs in the window</small></p>'
    : `<table><tr><th>release</th><th>OS</th><th>n</th><th>p50</th><th>p75</th><th>p95</th><th>crash-free</th></tr>
${rcRows
  .map(
    r =>
      `<tr><td>${esc(r.release)}</td><td>${esc(r.os)}</td><td>${
        r.n
      }</td><td>${fmt(r.p50)}</td><td>${fmt(r.p75)}</td><td>${fmt(
        r.p95,
      )}</td><td>${
        r.crashFree == null ? '—' : `${(r.crashFree * 100).toFixed(2)}%`
      }</td></tr>`,
  )
  .join('')}
</table>`
}
<h2>Trend per app (each app against its own history)</h2>
${trendRows.map(trendTable).join('')}
<h2>v2 production (real users — a different question, never mixed)</h2>
<table><tr><th>date</th><th>OS</th><th>n</th><th>p50</th><th>p75</th><th>p95</th></tr>
${prodTrend
  .flatMap(({ date, rows }) =>
    rows.map(
      r =>
        `<tr><td>${date}</td><td>${esc(r['os.name'])}</td><td>${
          r['count()']
        }</td><td>${fmt(r['p50(span.duration)'])}</td><td>${fmt(
          r['p75(span.duration)'],
        )}</td><td>${fmt(r['p95(span.duration)'])}</td></tr>`,
    ),
  )
  .join('')}
</table>
</body></html>\n`;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html);
fs.writeFileSync(path.join(OUT_DIR, 'summary.md'), summary);
if (gaps.length)
  fs.writeFileSync(path.join(OUT_DIR, 'gaps.flag'), `${gaps.join('\n')}\n`);
console.log(
  `written ${OUT_DIR}/index.html and summary.md (${days.length} day(s) of history, ${gaps.length} gap(s))`,
);
