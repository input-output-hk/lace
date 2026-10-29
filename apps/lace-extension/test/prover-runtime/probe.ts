import { createProverClient } from '@lace-lib/midnight-prover';

// The browser regression exercises the internal wire protocol directly.
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  createByteClient,
  digest,
} from '../../../../packages/lib/midnight-prover/src/bytes';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { encodeRequest } from '../../../../packages/lib/midnight-prover/src/protocol';

import type { ProverCommand, ProverReply } from '@lace-lib/midnight-prover';

declare const REPORT_URL: string;
declare const DURATION_MS: number;
declare const REAL_FIXTURE: boolean;
declare const FIXTURE_COUNT: number;
// A wallet UI can have unrelated listeners (for example Trezor's keepalive).
chrome.runtime.onMessage.addListener(() => false);
const assert: (condition: unknown, detail: string) => asserts condition = (
  condition,
  detail,
) => {
  if (!condition) throw new Error(detail);
};
const send = async (message: unknown) => chrome.runtime.sendMessage(message);
const route = async (command: ProverCommand): Promise<ProverReply> =>
  send({ target: 'test-harness', command });
const control = (
  id: string,
  operation: 'cancel' | 'poll' | 'release',
): ProverCommand => ({ target: 'lace:prover', version: 2, id, operation });
const bytesFor = (id: string) =>
  createByteClient(async operation => {
    const reply = await route({
      target: 'lace:prover',
      version: 2,
      id,
      ...operation,
    });
    if (!reply.ok) throw new Error(reply.error);
    assert('bytes' in reply, 'missing bytes reply');
    return reply.bytes;
  });
const start = async (id: string, milliseconds: number | string = 0) => {
  const request = await encodeRequest(
    {
      method: 'prove',
      circuit: {
        serializedPreimage: new Uint8Array(),
        keyLocation: String(milliseconds),
      },
    },
    bytesFor(id).upload,
  );
  const reply = await route({
    target: 'lace:prover',
    version: 2,
    id,
    operation: 'start',
    request,
  });
  assert(reply.ok, JSON.stringify(reply));
};
const poll = async (id: string) => {
  const reply = await route(control(id, 'poll'));
  assert(reply.ok && 'job' in reply, JSON.stringify(reply));
  return reply.job;
};
const proveThroughPort = async (index: number) => {
  const path = `fixtures/${index}/`;
  const port = chrome.runtime.connect({ name: 'proof-transport-test' });
  const pending = new Map<
    string,
    { resolve: (reply: ProverReply) => void; reject: (error: Error) => void }
  >();
  let maxMessage = 0;
  port.onMessage.addListener(({ id, reply }) => {
    maxMessage = Math.max(maxMessage, JSON.stringify(reply).length);
    pending.get(id)?.resolve(reply);
    pending.delete(id);
  });
  port.onDisconnect.addListener(() => {
    for (const request of pending.values())
      request.reject(new Error('Test port disconnected'));
    pending.clear();
  });
  const provider = createProverClient({
    ensure: async () => {},
    release: async () => {},
    send: async command =>
      new Promise((resolve, reject) => {
        const id = crypto.randomUUID();
        const message = { id, command };
        maxMessage = Math.max(maxMessage, JSON.stringify(message).length);
        pending.set(id, { resolve, reject });
        try {
          port.postMessage(message);
        } catch (error) {
          pending.delete(id);
          reject(error);
        }
      }),
  }).provider();
  try {
    if (!REAL_FIXTURE) {
      const abort = new AbortController();
      const blocked = provider.prove(
        { keyLocation: '30000', serializedPreimage: new Uint8Array() },
        abort.signal,
      );
      const cancelled = blocked.then(
        () => {
          throw new Error('Cancelled proof resolved');
        },
        error => {
          assert(
            error.message === 'Proof cancelled',
            'Unexpected cancellation error',
          );
        },
      );
      // Let computation start, then cancel through the same two hops as a dApp.
      await new Promise(resolve => setTimeout(resolve, 1000));
      const started = Date.now();
      abort.abort();
      await cancelled;
      await provider.prove({
        keyLocation: '0',
        serializedPreimage: new Uint8Array(),
      });
      assert(
        Date.now() - started < 5000,
        'Provider cancellation left the worker busy',
      );
    }
    const load = async (name: string) =>
      new Uint8Array(await (await fetch(path + name)).arrayBuffer());
    const meta = REAL_FIXTURE
      ? await (await fetch(path + 'meta.json')).json()
      : { k: 17, keyLocation: 'large' };
    const key = REAL_FIXTURE
      ? await load('circuit.prover')
      : new Uint8Array(33_666_884).fill(7);
    const hash = await digest(key);
    const circuit = {
      keyLocation: meta.keyLocation,
      serializedPreimage: REAL_FIXTURE
        ? await load('preimage.bin')
        : new Uint8Array([1]),
      keyMaterial: {
        proverKey: key,
        verifierKey: REAL_FIXTURE
          ? await load('circuit.verifier')
          : new Uint8Array([2]),
        ir: REAL_FIXTURE ? await load('circuit.bzkir') : new Uint8Array([3]),
      },
    };
    await fetch(REPORT_URL, {
      method: 'POST',
      body: JSON.stringify({
        progress: true,
        k: meta.k,
        phase: 'checking-and-proving',
      }),
    });
    const started = Date.now();
    const proof = await provider.checkAndProve(circuit);
    assert(proof.length > 0, 'Empty proof');
    assert((await digest(key)) === hash, 'Caller key mutated or detached');
    if (!REAL_FIXTURE)
      assert((await digest(proof)) === hash, 'Large result corrupted');
    assert(maxMessage < 525_312, 'Unbounded JSON message');
    return {
      k: meta.k,
      proofBytes: proof.length,
      proveMs: Date.now() - started,
      largestPortMessage: maxMessage,
    };
  } finally {
    port.disconnect();
  }
};
void (async () => {
  try {
    const results = [];
    for (let index = 0; index < FIXTURE_COUNT; index++) {
      results.push(await proveThroughPort(index));
      await fetch(REPORT_URL, {
        method: 'POST',
        body: JSON.stringify({
          progress: true,
          ...results[results.length - 1],
        }),
      });
    }
    const large = results[results.length - 1];
    if (!REAL_FIXTURE) {
      await start('initial');
      assert(
        (await send(control('unauthorized', 'poll'))) === undefined,
        'sender gate',
      );
      await route(control('initial', 'cancel'));
      await route(control('initial', 'release'));
      await start('cancel', 30000);
      const started = Date.now();
      const cancelled = await route(control('cancel', 'cancel'));
      assert(
        cancelled.ok &&
          'job' in cancelled &&
          cancelled.job.status === 'cancelled',
        'cancel response',
      );
      assert(
        Date.now() - started < 5000,
        'cancellation waited for computation',
      );
      await route(control('cancel', 'release'));
      const identity = await send({
        target: 'test-harness',
        operation: 'ping',
      });
      await start('crashed', 'crash');
      await start('following', 100);
      assert(
        (await poll('following')).status === 'queued',
        'second proof was not queued',
      );
      const recoveryDeadline = Date.now() + 15000;
      while ((await poll('following')).status !== 'succeeded') {
        assert(Date.now() < recoveryDeadline, 'queued proof did not recover');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert(
        (await poll('crashed')).status === 'failed',
        'worker crash not reported',
      );
      const following = await poll('following');
      assert(
        following.result && 'proof' in following.result,
        'missing queued proof',
      );
      assert(
        String(await bytesFor('following').download(following.result.proof)) ===
          '1,2,3',
        'wrong queued proof',
      );
      assert(
        (await send({ target: 'test-harness', operation: 'ping' })).instance ===
          identity.instance,
        'SW replaced after worker crash',
      );
      await route(control('crashed', 'release'));
      await route(control('following', 'release'));
      await start('long', DURATION_MS);
      const deadline = Date.now() + DURATION_MS + 30000;
      for (;;) {
        assert(
          (await send({ target: 'test-harness', operation: 'ping' }))
            .instance === identity.instance,
          'SW replaced',
        );
        const job = await poll('long');
        if (job.status === 'succeeded') {
          assert(job.result && 'proof' in job.result, 'missing proof');
          assert(
            String(await bytesFor('long').download(job.result.proof)) ===
              '1,2,3',
            'wrong proof',
          );
          break;
        }
        assert(
          job.status === 'running' && Date.now() < deadline,
          JSON.stringify(job),
        );
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      await route(control('long', 'release'));
      await start('survivor', 45000);
      await new Promise(resolve => setTimeout(resolve, 65000));
      assert(
        (await send({ target: 'test-harness', operation: 'ping' })).instance !==
          identity.instance,
        'SW did not retire',
      );
      const recovered = await poll('survivor');
      assert(
        recovered.status === 'succeeded' &&
          recovered.result &&
          'proof' in recovered.result,
        'lost result',
      );
      assert(
        String(await bytesFor('survivor').download(recovered.result.proof)) ===
          '1,2,3',
        'corrupt recovered result',
      );
      await route(control('survivor', 'release'));
    }
    await fetch(REPORT_URL, {
      method: 'POST',
      body: JSON.stringify({
        passed: true,
        ...large,
        results,
        artifact: REAL_FIXTURE,
        debuggerAttached: false,
        blockedWorkerMs: REAL_FIXTURE ? undefined : DURATION_MS,
      }),
    });
  } catch (error) {
    await fetch(REPORT_URL, {
      method: 'POST',
      body: JSON.stringify({ passed: false, error: String(error) }),
    });
  }
})();
