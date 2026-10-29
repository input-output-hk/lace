import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { expect } from 'playwright/test';

const artifact = process.env.PROVER_E2E_ARTIFACT;
assert(artifact, 'Set PROVER_E2E_ARTIFACT to a complete extension build');
const temporary = await mkdtemp(join(tmpdir(), 'lace-startup-e2e-'));
const extension = join(temporary, 'extension');
let context;
try {
  await cp(resolve(artifact), extension, { recursive: true });
  const manifest = JSON.parse(
    await readFile(join(extension, 'manifest.json'), 'utf8'),
  );
  const entry = join(extension, manifest.background.service_worker);
  // Observe the real bundled entry before any SDK initialization. No imports,
  // listeners or startup code are replaced with a test service worker.
  const observe = () => {
    const probe = { synchronousInstallListener: false, errors: [] };
    globalThis.__laceStartupProbe = probe;
    let initialEvaluation = true;
    queueMicrotask(() => {
      initialEvaluation = false;
    });
    const add = self.addEventListener.bind(self);
    add('error', event => probe.errors.push(event.message));
    add('unhandledrejection', event => probe.errors.push(String(event.reason)));
    self.addEventListener = (type, listener, options) => {
      if (type === 'install')
        probe.synchronousInstallListener = initialEvaluation;
      return add(type, listener, options);
    };
  };
  await writeFile(
    entry,
    `(${observe.toString()})();\n${await readFile(entry, 'utf8')}`,
  );
  for (const phase of [
    'install',
    'restart',
    'migration-install',
    'migration-restart',
  ]) {
    context = await chromium.launchPersistentContext(
      join(temporary, 'profile'),
      {
        executablePath:
          process.env.PROVER_TEST_CHROME || chromium.executablePath(),
        headless: false,
        viewport: phase.endsWith('install')
          ? { width: 1920, height: 993 }
          : { width: 390, height: 760 },
        args: [
          '--headless=new',
          '--no-sandbox',
          '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost',
          `--disable-extensions-except=${extension}`,
          `--load-extension=${extension}`,
        ],
      },
    );
    const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent('serviceworker', { timeout: 60000 }));
    const id = new URL(worker.url()).hostname;
    const page = await context.newPage();
    await page.goto(`chrome-extension://${id}/expo/index.html`, {
      waitUntil: 'domcontentloaded',
    });
    await page
      .getByTestId('onboarding-start-create-wallet-button')
      .waitFor({ state: 'visible', timeout: 90000 });
    // Opening the extension wakes a dormant worker after browser restart.
    const initial = await worker.evaluate(() => globalThis.__laceStartupProbe);
    assert(
      initial?.synchronousInstallListener,
      `${phase}: install listener was deferred by async initialization`,
    );
    const migrationEnabled = phase.startsWith('migration-');
    if (migrationEnabled) {
      await page.getByText('Migrate a wallet', { exact: true }).click();
      await expect(page.getByTestId('migrate-wallet-intro')).toBeInViewport();
      const start = page.getByTestId('migrate-wallet-intro-primary');
      await start.scrollIntoViewIfNeeded();
      await expect(start).toBeInViewport();
      await start.click();
      await expect(
        page.getByTestId('migrate-wallet-choose-destination'),
      ).toBeInViewport();
    } else {
      await expect(
        page.getByText('Migrate a wallet', { exact: true }),
      ).toHaveCount(0);
    }
    if (phase === 'restart') {
      // Seed only this disposable profile; the production artifact stays default-off.
      await page.evaluate(async () => {
        const port = chrome.runtime.connect({ name: 'feature-flags' });
        let timer;
        try {
          const featureFlags = await new Promise((resolve, reject) => {
            timer = setTimeout(
              () => reject(new Error('Feature flags request timed out')),
              15000,
            );
            port.onMessage.addListener(message => {
              if (message.messageId !== 'migration-test-flags') return;
              if (!Array.isArray(message.response)) {
                reject(new Error('Feature flags response is not an array'));
                return;
              }
              resolve(message.response);
            });
            port.postMessage({
              messageId: 'migration-test-flags',
              request: { method: 'getFeatureFlags', args: [] },
            });
          });
          if (featureFlags.some(flag => flag.key === 'MIGRATE_WALLET')) {
            throw new Error('Migration must be off before the test opts in');
          }
          await chrome.storage.local.set({
            featureFlags: {
              featureFlags: [...featureFlags, { key: 'MIGRATE_WALLET' }],
            },
          });
        } finally {
          clearTimeout(timer);
          port.disconnect();
        }
      });
    }
    if (process.env.PROVER_E2E_PROOF_DIR) {
      await page.screenshot({
        path: join(process.env.PROVER_E2E_PROOF_DIR, `${phase}.png`),
      });
    }
    const probe = await worker.evaluate(() => globalThis.__laceStartupProbe);
    assert.deepEqual(probe.errors, [], `${phase}: worker startup errors`);
    console.log(
      JSON.stringify({
        passed: true,
        phase,
        synchronousInstallListener: true,
        onboardingReady: true,
        migrationDisabledByDefault: !migrationEnabled,
        migrationOverlayUsable: migrationEnabled,
      }),
    );
    await context.close();
    context = undefined;
  }
} finally {
  await context?.close();
  await rm(temporary, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 100,
  });
}
