import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

import * as v8 from '@midnightntwrk/ledger-v8';
import * as v9 from '@midnightntwrk/ledger-v9';
import { chromium } from '@playwright/test';

const fixtures = Object.fromEntries(
  [
    ['v8', v8],
    ['v9', v9],
  ].map(([epoch, ledger]) => {
    const intent = ledger.Intent.new(new Date('2030-01-01T00:00:00Z'));
    intent.guaranteedUnshieldedOffer = ledger.UnshieldedOffer.new(
      [],
      [{ owner: '02'.repeat(32), type: ledger.nativeToken().raw, value: 23n }],
      [],
    );
    const tx = ledger.Transaction.fromParts(
      'undeployed',
      undefined,
      undefined,
      intent,
    ).mockProve();
    return [epoch, Buffer.from(tx.serialize()).toString('hex')];
  }),
);
const server = spawn(
  process.execPath,
  [new URL('./serve.mjs', import.meta.url).pathname],
  {
    env: { ...process.env, MIDNIGHT_SWAP_PORT: '18093' },
    stdio: ['ignore', 'pipe', 'inherit'],
  },
);
const resources = { browser: undefined };
try {
  await Promise.race([
    once(server.stdout, 'data'),
    once(server, 'exit').then(() => {
      throw new Error('Test server exited before starting');
    }),
  ]);
  resources.browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {}),
  });
  const page = await resources.browser.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('http://127.0.0.1:18093');
  const click = async id => {
    await page.locator(`#${id}`).click();
    await page.waitForFunction(
      () =>
        !document.querySelector('#status').textContent.includes('in progress'),
    );
  };
  await click('discover');
  assert.match(
    await page.locator('#status').textContent(),
    /No Midnight provider/,
  );
  await page.evaluate(txByEpoch => {
    window.calls = [];
    window.account = 'maker';
    window.rejectNext = false;
    const wallet = {
      getConnectionStatus: async () => ({
        status: 'connected',
        networkId: 'undeployed',
      }),
      getShieldedAddresses: async () => ({
        shieldedAddress: window.account + '-shielded',
      }),
      getUnshieldedAddress: async () => ({
        unshieldedAddress: window.account + '-unshielded',
      }),
      getShieldedBalances: async () => ({
        ['11'.repeat(32)]: 9007199254740993n,
      }),
      getUnshieldedBalances: async () => ({}),
      getDustBalance: async () => ({ cap: 100n, balance: 50n }),
      makeIntent: async (inputs, outputs, options) => {
        window.calls.push({ method: 'makeIntent', inputs, outputs, options });
        if (window.rejectNext) {
          window.rejectNext = false;
          throw new Error(
            'User rejected transaction https://example.invalid/api?project_id=SECRET',
          );
        }
        return { tx: txByEpoch[document.querySelector('#epoch').value] };
      },
      balanceSealedTransaction: async (tx, options) => {
        window.calls.push({ method: 'balance', tx, options });
        return { tx };
      },
      submitTransaction: async tx => {
        window.calls.push({ method: 'submit', tx });
      },
    };
    window.midnight = {
      test: {
        name: 'Mock connector (no funds)',
        rdns: 'test.lace',
        apiVersion: '4.1.0',
        connect: async () => wallet,
      },
    };
  }, fixtures);
  await click('discover');
  await click('connect');
  await page.locator('#inputs [data-field="type"]').fill('11'.repeat(32));
  await page.locator('#inputs [data-field="value"]').fill('9007199254740993');
  await page.locator('#outputs [data-field="kind"]').selectOption('unshielded');
  await page.locator('#outputs [data-field="type"]').fill('00'.repeat(32));
  await page.locator('#outputs [data-field="value"]').fill('23');
  await page
    .locator('#outputs [data-field="recipient"]')
    .fill('synthetic-recipient');
  await page.locator('#intent').fill('7');
  await page.evaluate(() => {
    window.rejectNext = true;
  });
  await click('create');
  assert.match(await page.locator('#status').textContent(), /User rejected/);
  assert.doesNotMatch(await page.locator('#report').textContent(), /SECRET/);
  for (const epoch of ['v8', 'v9']) {
    await page.locator('#epoch').selectOption(epoch);
    await click('create');
    assert.match(
      await page.locator('#inspection').textContent(),
      /"intentIds"/,
    );
    assert.match(
      await page.locator('#inspection').textContent(),
      /"value": "23"/,
    );
    const request = await page.evaluate(() => {
      const call = window.calls.filter(c => c.method === 'makeIntent').at(-1);
      return {
        amount: call.inputs[0].value.toString(),
        id: call.options.intentId,
        fees: call.options.payFees,
      };
    });
    assert.deepEqual(request, {
      amount: '9007199254740993',
      id: 7,
      fees: false,
    });
    const submittedBefore = await page.evaluate(
      () => window.calls.filter(c => c.method === 'submit').length,
    );
    await click('balance');
    assert.match(await page.locator('#balanced').textContent(), /"intentIds"/);
    assert.equal(
      await page.evaluate(
        () => window.calls.filter(c => c.method === 'submit').length,
      ),
      submittedBefore,
    );
    await page.evaluate(() => {
      window.account = 'changed';
    });
    await click('submit');
    assert.match(
      await page.locator('#status').textContent(),
      /account changed/,
    );
    assert.equal(
      await page.evaluate(
        () => window.calls.filter(c => c.method === 'submit').length,
      ),
      submittedBefore,
    );
    await page.evaluate(() => {
      window.account = 'maker';
    });
    await click('balance');
    await click('submit');
    assert.equal(
      await page.evaluate(
        () => window.calls.filter(c => c.method === 'submit').length,
      ),
      submittedBefore + 1,
    );
    await click('submit');
    assert.match(
      await page.locator('#status').textContent(),
      /Balance this offer/,
    );
  }
  await page.locator('#offer').fill(
    JSON.stringify({
      format: 'lace-swap-test-1',
      network: 'preview',
      epoch: 'v9',
      tx: fixtures.v9,
    }),
  );
  await click('load');
  assert.match(await page.locator('#status').textContent(), /does not match/);
  await page.locator('#offer').fill(
    JSON.stringify({
      format: 'lace-swap-test-1',
      network: 'undeployed',
      epoch: 'v9',
      tx: 'zz',
    }),
  );
  await click('load');
  assert.match(await page.locator('#status').textContent(), /hexadecimal/);
  assert.deepEqual(pageErrors, []);
  process.stdout.write(
    'Browser smoke passed: discovery, rejection/retry, bigint, explicit ID forwarding, v8/v9 WASM decoding, separate submission, account guard, duplicate submit guard, wrong network and malformed bytes. Connector and proofs are synthetic.\n',
  );
} finally {
  await resources.browser?.close();
  server.kill();
}
