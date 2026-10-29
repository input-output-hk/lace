// Fixture-driven harness for scripts/perf-report/{collect,render}.mjs.
//
// collect.mjs is exercised against a local mock of the Sentry and
// BrowserStack APIs (the PERF_REPORT_*_BASE seams), with canned payloads
// shaped like the real responses probed on 2026-09-25. render.mjs is
// exercised against dated history fixtures. Both run as child processes —
// the scripts are what CI runs, so the tests run the scripts.

import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
} from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const COLLECT = join(HERE, '..', 'perf-report', 'collect.mjs');
const RENDER = join(HERE, '..', 'perf-report', 'render.mjs');

const TMP = mkdtempSync(join(tmpdir(), 'perf-report-test-'));
afterAll(() => rmSync(TMP, { recursive: true, force: true }));

// ── Mock API server ─────────────────────────────────────────────────────────

const LACE_NEXT = '4511780014260224';
const V2_MOBILE = '4509327135473664';
const freshIso = new Date().toISOString();

const eventsResponse = url => {
  const q = url.searchParams.get('query') ?? '';
  const project = url.searchParams.get('project');

  if (q.includes('release-candidate')) return { data: [] };
  if (q.includes('span.op:pageload'))
    return {
      data: [
        {
          'count()': 20,
          'p75(measurements.lcp)': null,
          'p75(measurements.fcp)': 468,
          'p75(measurements.cls)': null,
          'p75(measurements.inp)': null,
        },
      ],
    };
  if (q.includes('environment:production'))
    return {
      data: [
        {
          'os.name': 'Android',
          'count()': 960,
          'p50(span.duration)': 275.9,
          'p75(span.duration)': 601.4,
          'p95(span.duration)': 1373.6,
        },
      ],
    };
  // nightly raw samples: only lace-next cold and full_display have data; v2
  // and warm are empty.
  if (project === LACE_NEXT && q.includes('app.start.cold'))
    return {
      data: [
        { 'span.duration': 826, 'os.name': 'Android', release: 'sha-abc' },
        { 'span.duration': 731, 'os.name': 'Android', release: 'sha-abc' },
        { 'span.duration': 655, 'os.name': 'Android', release: 'sha-abc' },
        { 'span.duration': 901, 'os.name': 'iOS', release: 'sha-abc' },
      ],
    };
  if (project === LACE_NEXT && q.includes('ui.load.full_display'))
    return {
      data: [
        { 'span.duration': 1490, 'os.name': 'Android', release: 'sha-abc' },
        { 'span.duration': 1602, 'os.name': 'Android', release: 'sha-abc' },
      ],
    };
  return { data: [] };
};

const bsResponse = pathname => {
  if (pathname === '/app-automate/builds.json')
    return [
      {
        automation_build: {
          name: 'perf-app-start lace-next android',
          hashed_id: 'build123',
          status: 'done',
        },
      },
      {
        automation_build: {
          name: 'perf-portfolio lace-next android',
          hashed_id: 'build789',
          status: 'done',
        },
      },
      {
        automation_build: {
          name: 'Lace Mobile - Android CI 123',
          hashed_id: 'other456',
          status: 'done',
        },
      },
    ];
  if (pathname.startsWith('/app-automate/builds/build789/appprofiling'))
    return {
      build_id: 'build789',
      total_sessions: 1,
      sessions: [
        {
          metadata: { device: 'Google Pixel 8', created_at: freshIso },
          data: {
            units: {},
            'io.lace.mobilewallet': {
              status: 'success',
              metrics: {
                app_size: 218.65,
                cpu: { avg: 11.4, max: 42.1 },
                mem: { avg: 512.0, max: 640.0 },
                ui_rendering: {
                  slow_frames_pct: 7.2,
                  frozen_frames_pct: 0,
                  num_anrs: 0,
                },
                screen_load: {
                  activity_load_time: [
                    {
                      name: 'MainActivity',
                      load_time_data: [
                        { time_offset_ms: 1685, load_time: 912 },
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      ],
    };
  if (pathname.startsWith('/app-automate/builds/build123/appprofiling'))
    return {
      build_id: 'build123',
      total_sessions: 2,
      sessions: [869, 887].map(loadTime => ({
        metadata: { device: 'Google Pixel 8', created_at: freshIso },
        data: {
          units: {},
          'io.lace.mobilewallet': {
            status: 'success',
            metrics: {
              app_size: 218.65,
              cpu: { avg: 2.0, max: 5.5 },
              mem: { avg: 356.0, max: 393.0 },
              ui_rendering: {
                slow_frames_pct: 4.8,
                frozen_frames_pct: 0,
                num_anrs: 0,
              },
              screen_load: {
                activity_load_time: [
                  {
                    name: 'MainActivity',
                    load_time_data: [
                      { time_offset_ms: 1685, load_time: loadTime },
                    ],
                  },
                ],
              },
            },
          },
        },
      })),
    };
  return {};
};

let server;
let baseUrl;
beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let body;
    if (url.pathname.endsWith('/events/')) body = eventsResponse(url);
    else if (url.pathname.endsWith('/sessions/')) body = { groups: [] };
    else body = bsResponse(url.pathname);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => server?.close());

// ── collect.mjs ─────────────────────────────────────────────────────────────

describe('collect.mjs', () => {
  let out;
  beforeAll(async () => {
    const outFile = join(TMP, 'collected.json');
    // Async on purpose: the mock server lives in THIS process, so a sync
    // exec would block the event loop and deadlock the child's requests.
    await promisify(execFile)(process.execPath, [COLLECT, '--out', outFile], {
      env: {
        ...process.env,
        PERF_REPORT_SENTRY_BASE: baseUrl,
        PERF_REPORT_BROWSERSTACK_BASE: baseUrl,
        SENTRY_READ_TOKEN: 'test-token',
        BROWSERSTACK_USERNAME: 'user',
        BROWSERSTACK_ACCESS_KEY: 'key',
      },
    });
    out = JSON.parse(readFileSync(outFile, 'utf8'));
  });

  it('groups raw nightly samples by OS and carries the release', () => {
    const cold = out.sentry.mobileNightly['lace-next']['app.start.cold'];
    expect(cold.Android.samples).toEqual([826, 731, 655]);
    expect(cold.Android.releases).toEqual(['sha-abc']);
    expect(cold.iOS.samples).toEqual([901]);
  });

  it('attributes BrowserStack sessions through the build name', () => {
    const cell = out.browserstack['lace-next:android'];
    expect(cell.device).toBe('Google Pixel 8');
    expect(cell.sessions).toHaveLength(2);
    expect(cell.sessions.map(s => s.screen_load_ms)).toEqual([869, 887]);
    // The unrelated CI build must not create a cell.
    expect(Object.keys(out.browserstack).sort()).toEqual([
      'lace-next:android',
      'portfolio/lace-next:android',
    ]);
  });

  it('namespaces portfolio-journey sessions apart from app-start ones', () => {
    const cell = out.browserstack['portfolio/lace-next:android'];
    expect(cell.sessions).toHaveLength(1);
    expect(cell.sessions[0].screen_load_ms).toBe(912);
    // Same app+platform, different journey — the app-start cell keeps only
    // its own two sessions.
    expect(out.browserstack['lace-next:android'].sessions).toHaveLength(2);
  });

  it('collects the portfolio TTFD samples alongside app start', () => {
    const ttfd = out.sentry.mobileNightly['lace-next']['ui.load.full_display'];
    expect(ttfd.Android.samples).toEqual([1490, 1602]);
  });

  it('records a gap for every expected-but-empty source, and only those', () => {
    expect(out.gaps).toContain(
      'Sentry: no app.start.cold nightly spans for lace-v2-mobile',
    );
    // full_display is collected but not gap-checked until lace-next's
    // TimeToFullDisplay bug is fixed (it has never emitted a span).
    expect(out.gaps.join()).not.toContain('ui.load.full_display');
    // 3 empty app-start cells + 3 empty portfolio cells (lace-next android
    // has data in both journeys).
    expect(out.gaps.filter(g => g.startsWith('BrowserStack'))).toHaveLength(6);
    expect(out.gaps.join()).not.toContain('lace-next android');
  });

  it('keeps production percentiles and web vitals as summaries', () => {
    expect(
      out.sentry.mobileProduction['lace-v2-mobile'][0]['p75(span.duration)'],
    ).toBe(601.4);
    expect(
      out.sentry.web['lace-extension-v2:nightly']['p75(measurements.fcp)'],
    ).toBe(468);
  });

  it('treats an empty RC window as normal, not a gap', () => {
    expect(out.sentry.mobileRC['lace-next'].releases).toEqual([]);
    expect(out.gaps.join()).not.toContain('release-candidate');
  });

  it('collects web vitals for lace-next too', () => {
    expect(out.sentry.web['lace-next:nightly']['count()']).toBe(20);
  });
});

// The loud-gap boundary: the controlled web cells must gap when empty, while
// production (real-user trend, not a pipeline we operate) must never gap.
describe('collect.mjs with empty web and production sources', () => {
  let out;
  let quietServer;
  beforeAll(async () => {
    quietServer = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost');
      let body;
      if (url.pathname.endsWith('/events/')) {
        const q = url.searchParams.get('query') ?? '';
        if (
          q.includes('span.op:pageload') ||
          q.includes('environment:production')
        )
          body = { data: [] };
        else body = eventsResponse(url);
      } else if (url.pathname.endsWith('/sessions/')) body = { groups: [] };
      else body = bsResponse(url.pathname);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
    });
    await new Promise(resolve => quietServer.listen(0, '127.0.0.1', resolve));
    const quietBase = `http://127.0.0.1:${quietServer.address().port}`;
    const outFile = join(TMP, 'collected-quiet.json');
    await promisify(execFile)(process.execPath, [COLLECT, '--out', outFile], {
      env: {
        ...process.env,
        PERF_REPORT_SENTRY_BASE: quietBase,
        PERF_REPORT_BROWSERSTACK_BASE: quietBase,
        SENTRY_READ_TOKEN: 'test-token',
        BROWSERSTACK_USERNAME: 'user',
        BROWSERSTACK_ACCESS_KEY: 'key',
      },
    });
    out = JSON.parse(readFileSync(outFile, 'utf8'));
  });
  afterAll(() => quietServer?.close());

  it('gaps the controlled nightly Web Vitals cells when they return no pageloads', () => {
    expect(out.gaps).toContain(
      'Sentry: no Web Vitals pageloads for lace-extension-v2 nightly',
    );
    expect(out.gaps).toContain(
      'Sentry: no Web Vitals pageloads for lace-next nightly',
    );
  });

  it('keeps production trend-only: an empty production window is never a gap', () => {
    expect(out.sentry.mobileProduction['lace-v2-mobile']).toEqual([]);
    expect(out.gaps.join()).not.toContain('production');
  });
});

// A full raw-sample page means rows beyond it were silently dropped — the
// medians can no longer be trusted, so the night must flag, not shrink.
describe('collect.mjs when a raw-sample page overflows', () => {
  let out;
  let fullServer;
  beforeAll(async () => {
    fullServer = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost');
      let body;
      if (url.pathname.endsWith('/events/')) {
        const q = url.searchParams.get('query') ?? '';
        const project = url.searchParams.get('project');
        if (
          project === LACE_NEXT &&
          q.includes('app.start.cold') &&
          q.includes('environment:nightly')
        )
          body = {
            data: Array.from({ length: 100 }, (_, i) => ({
              'span.duration': 700 + i,
              'os.name': 'Android',
              release: 'sha-abc',
            })),
          };
        else body = eventsResponse(url);
      } else if (url.pathname.endsWith('/sessions/')) body = { groups: [] };
      else body = bsResponse(url.pathname);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
    });
    await new Promise(resolve => fullServer.listen(0, '127.0.0.1', resolve));
    const fullBase = `http://127.0.0.1:${fullServer.address().port}`;
    const outFile = join(TMP, 'collected-overflow.json');
    await promisify(execFile)(process.execPath, [COLLECT, '--out', outFile], {
      env: {
        ...process.env,
        PERF_REPORT_SENTRY_BASE: fullBase,
        PERF_REPORT_BROWSERSTACK_BASE: fullBase,
        SENTRY_READ_TOKEN: 'test-token',
        BROWSERSTACK_USERNAME: 'user',
        BROWSERSTACK_ACCESS_KEY: 'key',
      },
    });
    out = JSON.parse(readFileSync(outFile, 'utf8'));
  });
  afterAll(() => fullServer?.close());

  it('flags the overflowing cell as a gap instead of trusting a truncated median', () => {
    expect(
      out.gaps.some(g =>
        g.includes('raw-sample page overflow for lace-next app.start.cold'),
      ),
    ).toBe(true);
    // The samples that did arrive are still collected for inspection.
    expect(
      out.sentry.mobileNightly['lace-next']['app.start.cold'].Android.samples,
    ).toHaveLength(100);
  });
});

// ── render.mjs ──────────────────────────────────────────────────────────────

const day = (
  date,
  { withV2 = true, gaps = [], nextAndroid = [826, 731, 655, 790, 812] } = {},
) => ({
  schema: 1,
  date,
  generatedAt: `${date}T05:00:00.000Z`,
  lookbackHours: 26,
  sentry: {
    mobileNightly: {
      'lace-next': {
        'app.start.cold': {
          Android: { samples: nextAndroid, releases: ['sha-a'] },
        },
        'app.start.warm': {},
      },
      'lace-v2-mobile': {
        'app.start.cold': withV2
          ? {
              Android: {
                samples: [540, 512, 601, 498, 555],
                releases: ['2.4.0'],
              },
            }
          : {},
        'app.start.warm': {},
      },
    },
    mobileProduction: {
      'lace-v2-mobile': [
        {
          'os.name': 'Android',
          'count()': 960,
          'p50(span.duration)': 275.9,
          'p75(span.duration)': 601.4,
          'p95(span.duration)': 1373.6,
        },
      ],
    },
    mobileRC: { 'lace-next': { releases: [], crashFree: [] } },
    web: {
      'lace-next:nightly': {
        'count()': 20,
        'p75(measurements.fcp)': 468,
        'p75(measurements.lcp)': null,
        'p75(measurements.cls)': null,
        'p75(measurements.inp)': null,
      },
    },
  },
  browserstack: {
    'lace-next:android': {
      device: 'Google Pixel 8',
      sessions: [
        { screen_load_ms: 869, mem_avg: 356, cpu_avg: 2, app_size: 218.65 },
      ],
    },
  },
  gaps,
});

const runRender = (history, outDir, extraArgs = []) =>
  execFileSync(
    process.execPath,
    [RENDER, '--history', history, '--out', outDir, ...extraArgs],
    {
      env: process.env,
    },
  );

describe('render.mjs', () => {
  it('renders a verdict when both sides have samples, and no gaps flag', () => {
    const history = join(TMP, 'history-full');
    const out = join(TMP, 'out-full');
    mkdirSync(history, { recursive: true });
    writeFileSync(
      join(history, '2026-01-01.json'),
      JSON.stringify(day('2026-01-01')),
    );
    writeFileSync(
      join(history, '2026-01-02.json'),
      JSON.stringify(day('2026-01-02')),
    );
    runRender(history, out);

    const summary = readFileSync(join(out, 'summary.md'), 'utf8');
    expect(summary).toContain('## Perf nightly — 2026-01-02');
    // The bootstrap is seeded by report date, so the verdict is exact: these
    // fixtures (n=5, wide CI) must read inconclusive, not flip per render.
    expect(summary).toContain('→ **inconclusive**');
    expect(summary).toContain('Weekly verdict');
    expect(summary).toContain('no RCs in the window');
    expect(summary).not.toContain('source(s) with no data');
    expect(existsSync(join(out, 'gaps.flag'))).toBe(false);

    // Re-rendering the same history reproduces the summary byte for byte.
    const outAgain = join(TMP, 'out-full-again');
    runRender(history, outAgain);
    expect(readFileSync(join(outAgain, 'summary.md'), 'utf8')).toBe(summary);

    const html = readFileSync(join(out, 'index.html'), 'utf8');
    expect(html).toContain('Trend per app');
    expect(html).toContain('lace-next');
  });

  it('refuses a history file whose schema does not match', () => {
    const history = join(TMP, 'history-schema');
    const out = join(TMP, 'out-schema');
    mkdirSync(history, { recursive: true });
    const stale = day('2026-01-06');
    stale.schema = 99;
    writeFileSync(join(history, '2026-01-06.json'), JSON.stringify(stale));
    expect(() => runRender(history, out)).toThrow();
  });

  it('warns on trend regressions, shrunken samples and web vitals presence', () => {
    const history = join(TMP, 'history-warnings');
    const out = join(TMP, 'out-warnings');
    mkdirSync(history, { recursive: true });
    // Three baseline nights, then a night whose p75 sits above the whole band
    // and whose v2 side shrank to a single sample.
    for (const d of ['2026-02-01', '2026-02-02', '2026-02-03'])
      writeFileSync(join(history, `${d}.json`), JSON.stringify(day(d)));
    const today = day('2026-02-04', {
      nextAndroid: [1200, 1250, 1300, 1280, 1220],
    });
    today.sentry.mobileNightly['lace-v2-mobile']['app.start.cold'] = {
      Android: { samples: [540], releases: ['2.4.0'] },
    };
    writeFileSync(join(history, '2026-02-04.json'), JSON.stringify(today));
    runRender(history, out);

    const summary = readFileSync(join(out, 'summary.md'), 'utf8');
    expect(summary).toContain('Possible regression: lace-next Android');
    expect(summary).toContain(
      'Shrunken sample: lace-v2-mobile Android (cold start) with n=1',
    );
    expect(summary).toContain('Web Vitals');
    expect(summary).toContain('lace-next:nightly: FCP 468 ms');
    // Warnings flag, never fail: no gaps.flag from warnings alone.
    expect(existsSync(join(out, 'gaps.flag'))).toBe(false);
  });

  it('surfaces gaps in the summary and writes gaps.flag', () => {
    const history = join(TMP, 'history-gaps');
    const out = join(TMP, 'out-gaps');
    mkdirSync(history, { recursive: true });
    writeFileSync(
      join(history, '2026-01-03.json'),
      JSON.stringify(
        day('2026-01-03', {
          withV2: false,
          gaps: ['Sentry: no app.start.cold nightly spans for lace-v2-mobile'],
        }),
      ),
    );
    runRender(history, out);

    const summary = readFileSync(join(out, 'summary.md'), 'utf8');
    expect(summary).toContain('1 source(s) with no data');
    expect(summary).toContain('no comparison (one side missing)');
    expect(readFileSync(join(out, 'gaps.flag'), 'utf8')).toContain(
      'lace-v2-mobile',
    );
  });

  it('renders the portfolio journey sections when its data is present', () => {
    const history = join(TMP, 'history-portfolio');
    const out = join(TMP, 'out-portfolio');
    mkdirSync(history, { recursive: true });
    const today = day('2026-01-05');
    today.sentry.mobileNightly['lace-next']['ui.load.full_display'] = {
      Android: { samples: [1490, 1602, 1550], releases: ['sha-a'] },
    };
    today.sentry.mobileNightly['lace-v2-mobile']['ui.load.full_display'] = {
      Android: { samples: [1310, 1290, 1400], releases: ['2.4.0'] },
    };
    today.browserstack['portfolio/lace-next:android'] = {
      device: 'Google Pixel 8',
      sessions: [
        { screen_load_ms: 912, mem_avg: 512, cpu_avg: 11, app_size: 218.65 },
      ],
    };
    writeFileSync(join(history, '2026-01-05.json'), JSON.stringify(today));
    runRender(history, out);

    const summary = readFileSync(join(out, 'summary.md'), 'utf8');
    expect(summary).toContain('Portfolio TTFD: lace-next vs v2');
    expect(summary).toMatch(/Portfolio TTFD[\s\S]*Android[^\n]*→ \*\*/);

    const html = readFileSync(join(out, 'index.html'), 'utf8');
    expect(html).toContain('portfolio TTFD (journey)');
    expect(html).toContain('BrowserStack — portfolio journey');
    expect(html).toContain('lace-next · Android · portfolio TTFD');
  });

  it('treats a requested but absent web verdict as a gap', () => {
    const history = join(TMP, 'history-web-gap');
    const out = join(TMP, 'out-web-gap');
    mkdirSync(history, { recursive: true });
    writeFileSync(
      join(history, '2026-01-04.json'),
      JSON.stringify(day('2026-01-04')),
    );
    runRender(history, out, [
      '--web-verdict',
      join(TMP, 'does-not-exist.json'),
    ]);

    const summary = readFileSync(join(out, 'summary.md'), 'utf8');
    expect(summary).toContain('1 source(s) with no data');
    expect(readFileSync(join(out, 'gaps.flag'), 'utf8')).toContain(
      'no harness verdict',
    );
  });

  // Pins the shape coupling between the harness artifact (measure-startup's
  // stats.pairs block) and render's ingestion — the happy path, not just the
  // missing-file gap.
  it('renders the harness web verdict from its JSON artifact', () => {
    const history = join(TMP, 'history-web-ok');
    const out = join(TMP, 'out-web-ok');
    mkdirSync(history, { recursive: true });
    writeFileSync(
      join(history, '2026-01-07.json'),
      JSON.stringify(day('2026-01-07')),
    );
    const verdictFile = join(TMP, 'web-verdict.json');
    writeFileSync(
      verdictFile,
      JSON.stringify({
        stats: {
          pairs: [
            {
              metric: 'startup',
              verdict: 'equivalent',
              diff: 5,
              ciLo: -10,
              ciHi: 20,
            },
          ],
        },
      }),
    );
    runRender(history, out, ['--web-verdict', verdictFile]);

    const summary = readFileSync(join(out, 'summary.md'), 'utf8');
    expect(summary).toContain('Web: lace-extension vs lace-next (harness)');
    expect(summary).toContain(
      'startup: **equivalent** · Δ 5 ms, CI95 [-10, 20]',
    );
    expect(existsSync(join(out, 'gaps.flag'))).toBe(false);
  });
});
