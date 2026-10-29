import { expect, it, vi } from 'vitest';

import { createProverClient } from '../src/client';
import { createProofJobs } from '../src/jobs';

const roundTrip = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const circuit = {
  keyLocation: 'custom',
  serializedPreimage: new Uint8Array([0, 255]),
  overwriteBindingInput: 2n ** 100n,
  keyMaterial: {
    proverKey: new Uint8Array([1]),
    verifierKey: new Uint8Array([2]),
    ir: new Uint8Array([3]),
  },
};
it('accepts concurrent circuit requests across providers without exceeding upload capacity', async () => {
  const jobs = createProofJobs({ idleMs: 0 });
  const provider = {
    check: async () => [],
    prove: async (request: { serializedPreimage: Uint8Array }) =>
      request.serializedPreimage,
  };
  const client = createProverClient({
    ensure: async () => {},
    release: async () => {},
    intervalMs: 0,
    send: async command =>
      roundTrip(await jobs.handle(roundTrip(command), 'extension', provider)),
  });
  const inputs = Array.from(
    { length: 6 },
    (_, index) => new Uint8Array([index]),
  );
  expect(
    await Promise.all(
      inputs.map(async serializedPreimage =>
        client.provider().prove({ ...circuit, serializedPreimage }),
      ),
    ),
  ).toEqual(inputs);
});
it('continues queued transfers after upload failure and skips cancelled callers', async () => {
  const jobs = createProofJobs({ idleMs: 0 });
  const provider = {
    check: async () => [],
    prove: vi.fn(async () => new Uint8Array([42])),
  };
  let rejectUpload!: () => void;
  let isFirstUpload = true;
  const client = createProverClient({
    ensure: async () => {},
    release: async () => {},
    intervalMs: 0,
    send: async command => {
      if (command.operation === 'upload' && isFirstUpload) {
        isFirstUpload = false;
        await new Promise<void>((_resolve, reject) => {
          rejectUpload = () => {
            reject(new Error('Transfer failed'));
          };
        });
      }
      return jobs.handle(command, 'extension', provider);
    },
  });
  const abort = new AbortController();
  const failed = client.provider().prove(circuit);
  const cancelled = client.provider(undefined, abort.signal).prove(circuit);
  const next = client.provider().prove(circuit);
  const settled = Promise.allSettled([failed, cancelled, next]);
  await vi.waitFor(() => {
    expect(rejectUpload).toBeTypeOf('function');
  });
  abort.abort();
  rejectUpload();
  expect(await settled).toEqual([
    { status: 'rejected', reason: new Error('Transfer failed') },
    { status: 'rejected', reason: new Error('Proof cancelled') },
    { status: 'fulfilled', value: new Uint8Array([42]) },
  ]);
  expect(provider.prove).toHaveBeenCalledTimes(1);
});

it('aborts an active provider and releases its slot for the next caller', async () => {
  const jobs = createProofJobs({ idleMs: 0 });
  const cancelled = new AbortController();
  let backendSignal: AbortSignal | undefined;
  const provider = {
    check: async () => [],
    prove: vi.fn(async (_request: unknown, signal?: AbortSignal) => {
      if (backendSignal) return new Uint8Array([42]);
      backendSignal = signal;
      return new Promise<Uint8Array>((_resolve, reject) => {
        signal!.addEventListener(
          'abort',
          () => {
            reject(
              signal!.reason instanceof Error
                ? signal!.reason
                : new Error('Proof cancelled'),
            );
          },
          {
            once: true,
          },
        );
      });
    }),
  };
  const client = createProverClient({
    ensure: async () => {},
    release: async () => {},
    intervalMs: 0,
    send: async command =>
      roundTrip(await jobs.handle(roundTrip(command), 'extension', provider)),
  });
  const first = client.provider().prove(circuit, cancelled.signal);
  const failure = expect(first).rejects.toThrow('Proof cancelled');
  const next = client.provider().prove(circuit);
  await vi.waitFor(() => {
    expect(backendSignal).toBeDefined();
  });
  expect(provider.prove).toHaveBeenCalledTimes(1);
  cancelled.abort();
  await failure;
  expect(backendSignal?.aborted).toBe(true);
  await expect(next).resolves.toEqual(new Uint8Array([42]));
});
