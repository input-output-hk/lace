import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, writeFile, rm, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const app = resolve(fileURLToPath(new URL('..', import.meta.url)));
const temporary = await mkdtemp(join(tmpdir(), 'lace-prover-e2e-'));
const dist = join(temporary, 'extension');
await mkdir(join(dist, 'js/sw'), { recursive: true });
const shared = {
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'chrome120',
  logLevel: 'warning',
};
// Use the production document entry and worker transport. Substitute only the
// computation, making the watchdog/cancellation regression deterministic.
await build({
  ...shared,
  stdin: {
    contents: (
      await readFile(join(app, 'src/offscreen/index.ts'), 'utf8')
    ).replace(
      "new URL('./prover-worker.ts', import.meta.url)",
      "new URL('prover-worker.js', location.href)",
    ),
    resolveDir: join(app, 'src/offscreen'),
    loader: 'ts',
  },
  outfile: join(dist, 'offscreen.js'),
});
await build({
  ...shared,
  entryPoints: [join(app, 'test/prover-runtime/worker.ts')],
  outfile: join(dist, 'prover-worker.js'),
});
await build({
  ...shared,
  entryPoints: [join(app, 'test/prover-runtime/sw.ts')],
  outfile: join(dist, 'js/sw/sw-script.js'),
});
await writeFile(
  join(dist, 'offscreen.html'),
  '<script src="offscreen.js"></script>',
);
await writeFile(join(dist, 'test.html'), '<title>Prover regression</title>');
await writeFile(
  join(dist, 'manifest.json'),
  JSON.stringify({
    name: 'Lace prover regression',
    version: '1.0',
    manifest_version: 3,
    permissions: ['offscreen'],
    background: { service_worker: 'js/sw/sw-script.js' },
  }),
);
const artifact = process.env.PROVER_E2E_ARTIFACT;
const fixture = process.env.PROVER_E2E_FIXTURE;
const fixtures = fixture?.split(',') ?? [];
if (Boolean(artifact) !== Boolean(fixture))
  throw new Error('Provide both PROVER_E2E_ARTIFACT and PROVER_E2E_FIXTURE');
const duration = Number(
  process.env.PROVER_E2E_DURATION_MS || (artifact ? 300000 : 65000),
);
if (artifact) {
  const sw = await readFile(join(dist, 'js/sw/sw-script.js'));
  await cp(join(artifact, 'js'), join(dist, 'js'), { recursive: true });
  await writeFile(join(dist, 'js/sw/sw-script.js'), sw);
  await cp(join(artifact, 'offscreen.html'), join(dist, 'offscreen.html'));
  const sourceManifest = JSON.parse(
    await readFile(join(artifact, 'manifest.json'), 'utf8'),
  );
  const manifest = JSON.parse(
    await readFile(join(dist, 'manifest.json'), 'utf8'),
  );
  manifest.key = sourceManifest.key;
  manifest.host_permissions = ['https://*/*', 'http://127.0.0.1/*'];
  manifest.content_security_policy = {
    ...sourceManifest.content_security_policy,
    // Preserve the artifact's worker/WASM/network policy, adding only reporting.
    extension_pages:
      sourceManifest.content_security_policy.extension_pages.replace(
        'connect-src ',
        'connect-src http://127.0.0.1:* ',
      ),
  };
  await writeFile(join(dist, 'manifest.json'), JSON.stringify(manifest));
  for (const [index, directory] of fixtures.entries()) {
    const destination = join(dist, 'fixtures', String(index));
    await mkdir(destination, { recursive: true });
    for (const name of [
      'meta.json',
      'preimage.bin',
      'circuit.prover',
      'circuit.verifier',
      'circuit.bzkir',
    ])
      await cp(join(directory, name), join(destination, name));
  }
}
let finish;
const report = new Promise(resolve => {
  finish = resolve;
});
const server = createServer(async (request, response) => {
  let body = '';
  for await (const chunk of request) body += chunk;
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.end('ok');
  if (request.method === 'POST') {
    const message = JSON.parse(body);
    if (message.progress) console.log(JSON.stringify(message));
    else finish(message);
  }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const reportUrl = `http://127.0.0.1:${server.address().port}/`;
await build({
  ...shared,
  entryPoints: [join(app, 'test/prover-runtime/probe.ts')],
  outfile: join(dist, 'test.js'),
  define: {
    REPORT_URL: JSON.stringify(reportUrl),
    DURATION_MS: String(duration),
    REAL_FIXTURE: String(Boolean(artifact)),
    FIXTURE_COUNT: String(fixtures.length || 1),
  },
});
await writeFile(
  join(dist, 'test.html'),
  '<title>Prover regression</title><script src="test.js"></script>',
);
await writeFile(
  join(dist, 'js/sw/sw-script.js'),
  (await readFile(join(dist, 'js/sw/sw-script.js'), 'utf8')) +
    '\nchrome.runtime.onInstalled.addListener(() => chrome.tabs.create({ url: chrome.runtime.getURL("test.html") }));',
);
// Playwright locates its browser only. No automation/debugger connection is made.
const browser = spawn(
  process.env.PROVER_TEST_CHROME || chromium.executablePath(),
  [
    '--headless=new',
    '--no-sandbox',
    '--no-first-run',
    `--user-data-dir=${join(temporary, 'profile')}`,
    `--disable-extensions-except=${dist}`,
    `--load-extension=${dist}`,
  ],
  { stdio: 'ignore' },
);
let timeout;
try {
  const result = await Promise.race([
    report,
    new Promise((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error('Browser regression timed out')),
        // Include the separate 65s SW-retirement wait and both large-data transfers.
        duration + 180000,
      );
    }),
    new Promise((_, reject) => browser.once('error', reject)),
  ]);
  console.log(JSON.stringify(result));
  if (!result.passed) throw new Error(result.error);
} finally {
  clearTimeout(timeout);
  if (browser.pid && browser.exitCode === null) {
    const exited = once(browser, 'exit');
    browser.kill('SIGTERM');
    await exited;
  }
  server.close();
  // Chrome's child processes can finish profile writes just after its exit.
  await rm(temporary, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 100,
  });
}
