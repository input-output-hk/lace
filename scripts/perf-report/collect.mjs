/**
 * Nightly perf-report collector: pulls the last night's measurements from
 * Sentry (app-start spans, Web Vitals) and BrowserStack (app profiling) and
 * writes one dated JSON — the unit the historical series is built from.
 *
 * Controlled-environment data (environment:nightly) is fetched as RAW samples
 * so render.mjs can compute bootstrap CIs with the shared stats.mjs;
 * production data is fetched as percentiles (real-user volume, trend only).
 * Sources that return nothing are recorded under `gaps` instead of failing:
 * an empty night must surface as an alert, not as a silently thinner report.
 *
 * Env: SENTRY_READ_TOKEN (user token, event:read; SENTRY_TOKEN accepted as
 * fallback), BROWSERSTACK_USERNAME, BROWSERSTACK_ACCESS_KEY.
 * Usage: node scripts/perf-report/collect.mjs [--out data/YYYY-MM-DD.json]
 *        [--lookback-hours 26]
 */

import fs from 'node:fs';
import path from 'node:path';
import { MOBILE_APPS, SCHEMA_VERSION, SENTRY_PROJECTS } from './registry.mjs';

const ORG = 'iohk-j4';
// Test seams: the vitest harness points these at a local mock server.
const SENTRY_BASE = process.env.PERF_REPORT_SENTRY_BASE ?? 'https://sentry.io';
const BS_BASE =
  process.env.PERF_REPORT_BROWSERSTACK_BASE ??
  'https://api-cloud.browserstack.com';
// BrowserStack build-name grammar: `<workflow prefix> <app> <platform>`, set
// by perf-nightly-app-start.yml and perf-nightly-portfolio.yml (both
// generations share the package name, so the build name carries the
// attribution). Cell keys keep the legacy unprefixed `app:platform` shape for
// app-start — the historical series and render.mjs depend on it — and
// namespace every other journey.
const BS_JOURNEYS = {
  'perf-app-start': '',
  'perf-portfolio': 'portfolio/',
};

const argValue = flag => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
};
// 16h from the 05:00 report reaches back to 13:00 the previous day — it
// covers everything tonight's crons produced (00:30–04:30) without touching
// the previous night's sessions. A 26h window double-counted: each night's
// samples appeared in two consecutive daily JSONs, silently narrowing the
// weekly pooled CIs and inflating n.
const LOOKBACK_HOURS = Number(argValue('--lookback-hours') ?? 16);
const today = new Date().toISOString().slice(0, 10);
const OUT = argValue('--out') ?? path.join('data', `${today}.json`);

const SENTRY_TOKEN = process.env.SENTRY_READ_TOKEN || process.env.SENTRY_TOKEN;
const BS_USER = process.env.BROWSERSTACK_USERNAME;
const BS_KEY = process.env.BROWSERSTACK_ACCESS_KEY;
if (!SENTRY_TOKEN)
  throw new Error('SENTRY_READ_TOKEN (or SENTRY_TOKEN) is required');
if (!BS_USER || !BS_KEY)
  throw new Error(
    'BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY are required',
  );

const gaps = [];

const sentryEvents = async params => {
  const url = new URL(`${SENTRY_BASE}/api/0/organizations/${ORG}/events/`);
  for (const [k, v] of Object.entries(params))
    for (const item of Array.isArray(v) ? v : [v])
      url.searchParams.append(k, item);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${SENTRY_TOKEN}` },
  });
  if (!res.ok)
    throw new Error(
      `Sentry ${res.status} for ${url.pathname}?${url.searchParams}`,
    );
  return (await res.json()).data;
};

const bsGet = async pathname => {
  const res = await fetch(`${BS_BASE}${pathname}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${BS_USER}:${BS_KEY}`).toString(
        'base64',
      )}`,
    },
  });
  if (!res.ok) throw new Error(`BrowserStack ${res.status} for ${pathname}`);
  return res.json();
};

/** Raw span samples for one app/environment — the CI-capable representation. */
const RAW_PAGE_SIZE = 100;
const rawStartSamples = async (project, environment, op) => {
  const rows = await sentryEvents({
    project: SENTRY_PROJECTS[project],
    dataset: 'spans',
    statsPeriod: `${LOOKBACK_HOURS}h`,
    query: `span.op:${op} environment:${environment}`,
    field: ['span.duration', 'os.name', 'release'],
    per_page: RAW_PAGE_SIZE,
  });
  // A full page means the night outgrew the single fetch: the samples beyond
  // it would be dropped in Sentry's default order, silently biasing the
  // medians — the one failure mode this report exists to avoid. Loud, like
  // every integrity failure; the fix is pagination (or a higher per_page).
  if (rows.length >= RAW_PAGE_SIZE)
    gaps.push(
      `Sentry: raw-sample page overflow for ${project} ${op} (${environment}) — ≥${RAW_PAGE_SIZE} rows; paginate before trusting tonight's medians`,
    );
  const byOs = {};
  for (const r of rows) {
    const os = r['os.name'] || 'unknown';
    byOs[os] ??= { samples: [], releases: new Set() };
    byOs[os].samples.push(r['span.duration']);
    if (r.release) byOs[os].releases.add(r.release);
  }
  return Object.fromEntries(
    Object.entries(byOs).map(([os, v]) => [
      os,
      { samples: v.samples, releases: [...v.releases] },
    ]),
  );
};

/** Percentile summary for high-volume (production) data. */
const percentileSummary = async (project, environment, op) =>
  sentryEvents({
    project: SENTRY_PROJECTS[project],
    dataset: 'spans',
    statsPeriod: `${LOOKBACK_HOURS}h`,
    query: `span.op:${op} environment:${environment}`,
    field: [
      'os.name',
      'count()',
      'p50(span.duration)',
      'p75(span.duration)',
      'p95(span.duration)',
    ],
    per_page: 10,
  });

const webVitals = async (project, environment) => {
  const rows = await sentryEvents({
    project: SENTRY_PROJECTS[project],
    dataset: 'spans',
    statsPeriod: `${LOOKBACK_HOURS}h`,
    query: `span.op:pageload environment:${environment}`,
    field: [
      'count()',
      'p75(measurements.lcp)',
      'p75(measurements.fcp)',
      'p75(measurements.cls)',
      'p75(measurements.inp)',
    ],
    per_page: 5,
  });
  return rows?.[0];
};

/**
 * RC view: per-release percentiles plus crash-free sessions. RCs are cut
 * roughly biweekly, so this looks back further than the nightly window; an
 * empty result means no RC in the window — normal, never a gap.
 */
const RC_WINDOW = '14d';
const rcSummary = async project => {
  const releases = await sentryEvents({
    project: SENTRY_PROJECTS[project],
    dataset: 'spans',
    statsPeriod: RC_WINDOW,
    query: 'span.op:app.start.cold environment:release-candidate',
    field: [
      'release',
      'os.name',
      'count()',
      'p50(span.duration)',
      'p75(span.duration)',
      'p95(span.duration)',
    ],
    per_page: 20,
  });
  let crashFree;
  try {
    const url = new URL(`${SENTRY_BASE}/api/0/organizations/${ORG}/sessions/`);
    url.searchParams.set('project', String(SENTRY_PROJECTS[project]));
    url.searchParams.set('environment', 'release-candidate');
    url.searchParams.set('statsPeriod', RC_WINDOW);
    url.searchParams.set('interval', '1d');
    url.searchParams.set('field', 'crash_free_rate(session)');
    url.searchParams.set('groupBy', 'release');
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${SENTRY_TOKEN}` },
    });
    if (res.ok)
      crashFree = ((await res.json()).groups ?? []).map(g => ({
        release: g.by?.release,
        crashFreeRate: g.totals?.['crash_free_rate(session)'],
      }));
  } catch {
    // sessions API is optional garnish on the RC view; the span data stands alone
  }
  return { releases, crashFree };
};

const collectSentry = async () => {
  const out = {
    mobileNightly: {},
    mobileProduction: {},
    mobileRC: {},
    web: {},
  };

  // ui.load.full_display = the portfolio TimeToFullDisplay mark, produced by
  // the @portfolio-journey sessions (and pooled with the functional nightly's
  // sessions that reach the same screen on the same device and build).
  // Collected but NOT a gap yet: lace-next's TimeToFullDisplay has never
  // emitted a span (0 in 30 days across every environment, verified
  // 2026-09-28, while its ui.load/initial_display flow fine) — a red alert
  // for a source that cannot deliver trains people to ignore red. Promote it
  // to a gap once the instrumentation bug is fixed and spans flow nightly.
  // Warm start stays gap-free too: no scenario can emit it (see trap 15).
  //
  // app.start.cold pools MORE than the dedicated @app-start repetitions:
  // the 03:30 lace-next functional and 03:35 portfolio sessions cold-launch
  // the same measured build at rate 1.0, so n is "at least N repetitions".
  // Accepted deliberately: same binary (discovery enforces freshness), same
  // device models (the wdio defaults), and the cold-start span closes before
  // the journeys diverge — extra launches tighten the CIs rather than bias
  // them. Never read n as "repetitions". The 04:00 v2 functional suite does
  // NOT pool: it runs the STORE binary (prefix `lace`, environment
  // production at the sampled rate) while measurement discovers the
  // `lace-measured` upload — that suite's unpredictable overlap with the
  // 05:00 collection was the reason for the prefix split.
  for (const { sentry: app } of MOBILE_APPS) {
    out.mobileNightly[app] = {};
    for (const op of [
      'app.start.cold',
      'app.start.warm',
      'ui.load.full_display',
    ]) {
      const byOs = await rawStartSamples(app, 'nightly', op);
      out.mobileNightly[app][op] = byOs;
      if (op === 'app.start.cold' && Object.keys(byOs).length === 0)
        gaps.push(`Sentry: no ${op} nightly spans for ${app}`);
    }
  }

  // Real-user trend — a different question than the controlled comparison
  // (perf-instruments axis 3 vs axis 2); never mixed with nightly data.
  // Trend-only BY DESIGN, never a gap: production reflects store traffic,
  // not a pipeline we operate, so an empty window is not a failure this
  // report can act on. The controlled sources above are the loud ones.
  // (Pinned by a test; revisit only if production becomes a monitored SLO.)
  out.mobileProduction['lace-v2-mobile'] = await percentileSummary(
    'lace-v2-mobile',
    'production',
    'app.start.cold',
  );

  out.mobileRC['lace-next'] = await rcSummary('lace-next');

  // lace-next web has no production until it replaces v2 — nightly only.
  // The nightly cells are controlled sources (the 02:00 comparison launches
  // both extensions), so an empty night is a gap like any other broken
  // instrument; the production cell is real-user trend, never a gap (same
  // rationale as mobileProduction above).
  const webCells = [
    ['lace-extension-v2', 'nightly', true],
    ['lace-extension-v2', 'production', false],
    ['lace-next', 'nightly', true],
  ];
  for (const [project, env, required] of webCells) {
    try {
      const row = await webVitals(project, env);
      out.web[`${project}:${env}`] = row;
      if (required && !(Number(row?.['count()']) > 0))
        gaps.push(`Sentry: no Web Vitals pageloads for ${project} ${env}`);
    } catch (error) {
      gaps.push(
        `Sentry: Web Vitals ${project} ${env} failed: ${error.message}`,
      );
    }
  }
  return out;
};

const collectBrowserStack = async () => {
  const cutoff = Date.now() - LOOKBACK_HOURS * 3600 * 1000;
  const builds = (await bsGet('/app-automate/builds.json?limit=50'))
    .map(b => b.automation_build)
    .filter(b =>
      Object.keys(BS_JOURNEYS).some(prefix => b.name?.startsWith(`${prefix} `)),
    );

  // One build per journey/matrix cell per night; each session inside is one
  // scenario run.
  const cells = {};
  for (const build of builds) {
    const [prefix, app, platform] = build.name.split(' ');
    const key = `${BS_JOURNEYS[prefix]}${app}:${platform}`;
    let payload;
    try {
      payload = await bsGet(
        `/app-automate/builds/${build.hashed_id}/appprofiling/v2?limit=10`,
      );
    } catch {
      continue; // profiling absent for this build — the gap check below reports it
    }
    for (const session of payload.sessions ?? []) {
      const created = Date.parse(session.metadata?.created_at ?? 0);
      if (created < cutoff) continue;
      const appData = Object.values(session.data ?? {}).find(
        v => typeof v === 'object' && v?.metrics,
      );
      if (!appData) continue;
      const m = appData.metrics;
      cells[key] ??= { device: session.metadata?.device, sessions: [] };
      cells[key].sessions.push({
        app_size: m.app_size,
        cpu_avg: m.cpu?.avg,
        cpu_max: m.cpu?.max,
        mem_avg: m.mem?.avg,
        mem_max: m.mem?.max,
        slow_frames_pct: m.ui_rendering?.slow_frames_pct,
        frozen_frames_pct: m.ui_rendering?.frozen_frames_pct,
        num_anrs: m.ui_rendering?.num_anrs,
        screen_load_ms:
          m.screen_load?.activity_load_time?.[0]?.load_time_data?.[0]
            ?.load_time,
      });
    }
  }

  for (const [prefix, namespace] of Object.entries(BS_JOURNEYS))
    for (const { bs: app } of MOBILE_APPS)
      for (const platform of ['android', 'ios'])
        if (!cells[`${namespace}${app}:${platform}`])
          gaps.push(
            `BrowserStack: no profiling sessions for ${app} ${platform} (${prefix})`,
          );

  return cells;
};

const [sentry, browserstack] = await Promise.all([
  collectSentry(),
  collectBrowserStack(),
]);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(
  OUT,
  `${JSON.stringify(
    {
      schema: SCHEMA_VERSION,
      date: today,
      generatedAt: new Date().toISOString(),
      lookbackHours: LOOKBACK_HOURS,
      sentry,
      browserstack,
      gaps,
    },
    null,
    2,
  )}\n`,
);
console.log(`written ${OUT} (${gaps.length} gap(s))`);
for (const gap of gaps) console.warn(`  ⚠️ ${gap}`);
