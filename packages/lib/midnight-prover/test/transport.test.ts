import { describe, expect, it, vi } from 'vitest';

import { createProverClient } from '../src/client';
import { executeCircuit } from '../src/execute';
import { createProofJobs } from '../src/jobs';
import { createProofWorker, serveProofWorker } from '../src/worker';

import type { ProofJobObserver } from '../src/activity';
import type { CircuitProvider } from '../src/protocol';

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
const pair = () => {
  const main = new Map<
    string,
    (event: { data: unknown; message?: string }) => void
  >();
  const child = new Map<string, (event: { data: unknown }) => void>();
  return {
    handle: {
      addEventListener: (
        type: string,
        listener: (event: { data: unknown }) => void,
      ) => {
        main.set(type, listener);
      },
      postMessage: (data: unknown, transfer?: Transferable[]) => {
        child.get('message')?.({ data: structuredClone(data, { transfer }) });
      },
      terminate: vi.fn(),
    },
    port: {
      addEventListener: (
        type: string,
        listener: (event: { data: unknown }) => void,
      ) => {
        child.set(type, listener);
      },
      postMessage: (data: unknown, transfer?: Transferable[]) => {
        main.get('message')?.({ data: structuredClone(data, { transfer }) });
      },
    },
    crash: (message?: string) => main.get('error')?.({ data: null, message }),
  };
};

describe('proof transport', () => {
  it.each([
    ['retained buffer', () => new ArrayBuffer(64)],
    ['WASM heap', () => new WebAssembly.Memory({ initial: 1 }).buffer],
  ] as const)(
    'copies proof views from a %s without detaching provider memory',
    async (_name, createBuffer) => {
      const { handle, port } = pair();
      const buffer = createBuffer();
      const originalLength = buffer.byteLength;
      const proof = new Uint8Array(buffer, 8, 2);
      proof.set([4, 5]);
      const load = vi.fn(async () => () => ({
        check: async () => [],
        prove: async () => proof,
      }));
      serveProofWorker(port, load);
      const worker = createProofWorker(handle);

      for (let index = 0; index < 2; index++) {
        const result = await worker.run({ method: 'prove', circuit }, () => {});
        expect(result).toEqual(new Uint8Array([4, 5]));
        expect((result as Uint8Array).buffer.byteLength).toBe(2);
        expect(buffer.byteLength).toBe(originalLength);
        expect(proof).toEqual(new Uint8Array([4, 5]));
      }
      expect(load).toHaveBeenCalledTimes(1);
    },
  );
  it('accepts the first request while WASM is loading and forwards progress', async () => {
    const { handle, port } = pair();
    let loaded!: (
      value: (
        progress: (event: {
          phase: 'proof-material';
          status: 'started';
        }) => void,
      ) => CircuitProvider,
    ) => void;
    serveProofWorker(
      port,
      async () =>
        new Promise(resolve => {
          loaded = resolve;
        }),
    );
    const worker = createProofWorker(handle);
    const progress = vi.fn();
    const result = worker.run({ method: 'prove', circuit }, progress);
    loaded(report => ({
      check: async () => [],
      prove: async () => {
        report({ phase: 'proof-material', status: 'started' });
        return new Uint8Array([4]);
      },
    }));
    expect(await result).toEqual(new Uint8Array([4]));
    expect(progress).toHaveBeenCalledWith({
      phase: 'proof-material',
      status: 'started',
    });
  });
  it('rejects every pending caller after worker death and refuses reuse', async () => {
    const { handle, crash } = pair();
    const worker = createProofWorker(handle);
    const result = worker.run({ method: 'prove', circuit }, () => {});
    crash();
    await expect(result).rejects.toThrow('Proof worker failed');
    await expect(
      worker.run({ method: 'check', circuit }, () => {}),
    ).rejects.toThrow('Proof worker failed');
    expect(handle.terminate).toHaveBeenCalledTimes(1);
  });
  it('preserves bounded worker diagnostics without source URLs and still terminates', async () => {
    const { handle, crash } = pair();
    const worker = createProofWorker(handle);
    const result = worker.run({ method: 'prove', circuit }, () => {});
    crash(
      'Uncaught RuntimeError: memory access out of bounds https://example.invalid/worker?token=private',
    );
    await expect(result).rejects.toThrow(
      'Proof worker failed: Uncaught RuntimeError: memory access out of bounds [URL]',
    );
    expect(handle.terminate).toHaveBeenCalledTimes(1);
  });
  it('runs a client through JSON messaging, the job queue and the worker', async () => {
    const { handle, port } = pair();
    serveProofWorker(port, async () => () => ({
      check: async () => [2n ** 90n, undefined],
      prove: async () => new Uint8Array([42]),
    }));
    const jobs = createProofJobs({
      idleMs: 0,
      createWorker: () => createProofWorker(handle),
    });
    const release = vi.fn(async () => {});
    const client = createProverClient({
      ensure: async () => {},
      send: async command => roundTrip(await jobs.handle(roundTrip(command))),
      release,
      intervalMs: 0,
    });
    expect(await client.provider().check(circuit)).toEqual([
      2n ** 90n,
      undefined,
    ]);
    expect(jobs.isActive()).toBe(true);
    expect(release).toHaveBeenCalledTimes(1);
  });
  it('accepts concurrent circuit requests without exceeding upload capacity', async () => {
    const { handle, port } = pair();
    serveProofWorker(port, async () => () => ({
      check: async () => [],
      prove: async request => request.serializedPreimage,
    }));
    const jobs = createProofJobs({
      idleMs: 0,
      createWorker: () => createProofWorker(handle),
    });
    const client = createProverClient({
      ensure: async () => {},
      release: async () => {},
      intervalMs: 0,
      send: async command => roundTrip(await jobs.handle(roundTrip(command))),
    });
    const inputs = Array.from(
      { length: 6 },
      (_, index) => new Uint8Array([index]),
    );
    const results = await Promise.all(
      inputs.map(async serializedPreimage =>
        client.provider().prove({ ...circuit, serializedPreimage }),
      ),
    );
    expect(results).toEqual(inputs);
  });

  it('aborts a blocked worker from its owner', async () => {
    const { handle } = pair();
    const jobs = createProofJobs({
      idleMs: 0,
      createWorker: () => createProofWorker(handle),
    });
    const abort = new AbortController();
    const client = createProverClient({
      ensure: async () => {},
      send: async command => {
        const reply = await jobs.handle(command);
        if (command.operation === 'start') abort.abort();
        return reply;
      },
      release: async () => {},
      intervalMs: 0,
    });
    await expect(
      client.provider(undefined, abort.signal).prove(circuit),
    ).rejects.toThrow('Proof cancelled');
    expect(handle.terminate).toHaveBeenCalledTimes(1);
  });
});

it('announces receiving before the first upload, then reuses the prepared provider', async () => {
  const prepared = {
    check: vi.fn(async () => []),
    prove: vi.fn(async () => new Uint8Array([42])),
  };
  const fail = vi.fn();
  const prepare = vi.fn(() => ({ provider: prepared, fail }));
  const provider = { check: vi.fn(), prove: vi.fn(), prepare };
  const jobs = createProofJobs({ shouldForwardProvidersConcurrently: true });
  const operations: string[] = [];
  const client = createProverClient({
    ensure: async () => {},
    release: async () => {},
    intervalMs: 0,
    send: async command => {
      operations.push(command.operation);
      if (command.operation === 'upload')
        expect(prepare).toHaveBeenCalledTimes(1);
      return jobs.handle(command, 'owner', provider);
    },
  });
  expect(await client.provider().prove(circuit)).toEqual(new Uint8Array([42]));
  expect(operations[0]).toBe('begin');
  expect(prepared.prove).toHaveBeenCalledTimes(1);
  expect(provider.prove).not.toHaveBeenCalled();
  expect(fail).not.toHaveBeenCalled();
});

it('fails receiving on a rejected upload and releases the request', async () => {
  const fail = vi.fn();
  const provider: CircuitProvider = { check: vi.fn(), prove: vi.fn() };
  provider.prepare = () => ({ provider, fail });
  const jobs = createProofJobs({ byteLimits: { maxBytes: 0 } });
  const client = createProverClient({
    ensure: async () => {},
    release: async () => {},
    send: async command => jobs.handle(command, 'owner', provider),
  });
  await expect(client.provider().prove(circuit)).rejects.toThrow(
    'memory limit',
  );
  expect(fail).toHaveBeenCalledTimes(1);
  expect(provider.prove).not.toHaveBeenCalled();
});

it('deduplicates and bounds accepted transfers and expires abandoned uploads', async () => {
  vi.useFakeTimers();
  try {
    const fail = vi.fn();
    const provider: CircuitProvider = { check: vi.fn(), prove: vi.fn() };
    provider.prepare = vi.fn(() => ({ provider, fail }));
    const jobs = createProofJobs({ capacity: 1 });
    const begin = {
      target: 'lace:prover',
      version: 2,
      id: 'abandoned',
      operation: 'begin',
      method: 'prove',
    } as const;
    expect(await jobs.handle(begin, 'owner', provider)).toMatchObject({
      ok: true,
      job: { status: 'receiving' },
    });
    await jobs.handle(begin, 'owner', provider);
    expect(provider.prepare).toHaveBeenCalledTimes(1);
    expect(
      await jobs.handle({ ...begin, id: 'overflow' }, 'owner', provider),
    ).toMatchObject({ ok: false });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fail).toHaveBeenCalledTimes(1);
    expect(
      await jobs.handle({ ...begin, operation: 'poll' }, 'owner'),
    ).toMatchObject({ ok: true, job: { status: 'failed' } });
    expect(provider.prove).not.toHaveBeenCalled();
  } finally {
    vi.useRealTimers();
  }
});

it('clears the upload timeout before long computation starts', async () => {
  vi.useFakeTimers();
  try {
    let complete!: (value: Uint8Array) => void;
    const result = new Promise<Uint8Array>(resolve => {
      complete = resolve;
    });
    const fail = vi.fn();
    const provider: CircuitProvider = {
      check: vi.fn(),
      prove: async () => result,
    };
    provider.prepare = () => ({ provider, fail });
    const jobs = createProofJobs({ shouldForwardProvidersConcurrently: true });
    let jobId = '';
    const client = createProverClient({
      ensure: async () => {},
      release: async () => {},
      intervalMs: 500,
      send: async command => {
        jobId = command.id;
        return jobs.handle(command, 'owner', provider);
      },
    });
    const proof = client.provider().prove(circuit);
    await vi.waitFor(async () => {
      const reply = await jobs.handle(
        { target: 'lace:prover', version: 2, id: jobId, operation: 'poll' },
        'owner',
      );
      expect(reply).toMatchObject({ ok: true, job: { status: 'running' } });
    });
    await vi.advanceTimersByTimeAsync(61_000);
    expect(fail).not.toHaveBeenCalled();
    complete(new Uint8Array([42]));
    let output: Uint8Array | undefined;
    void proof.then(value => {
      output = value;
    });
    await vi.waitFor(() => {
      expect(output).toEqual(new Uint8Array([42]));
    });
  } finally {
    vi.useRealTimers();
  }
});

it('ends preparation when a queued provider call is cancelled before running', async () => {
  let complete!: (value: Uint8Array) => void;
  const work = new Promise<Uint8Array>(resolve => {
    complete = resolve;
  });
  const fail = vi.fn();
  const provider: CircuitProvider = {
    check: vi.fn(),
    prove: vi.fn(async () => work),
  };
  provider.prepare = () => ({ provider, fail });
  const jobs = createProofJobs({});
  const secondAbort = new AbortController();
  const client = createProverClient({
    ensure: async () => {},
    release: async () => {},
    intervalMs: 0,
    send: async command => {
      const reply = await jobs.handle(command, 'owner', provider);
      if (
        command.operation === 'start' &&
        reply.ok &&
        'job' in reply &&
        reply.job.status === 'queued'
      )
        secondAbort.abort();
      return reply;
    },
  });
  const first = client.provider().prove(circuit);
  await vi.waitFor(() => {
    expect(provider.prove).toHaveBeenCalledTimes(1);
  });
  const second = client.provider(undefined, secondAbort.signal).prove(circuit);
  await expect(second).rejects.toThrow('Proof cancelled');
  expect(fail).toHaveBeenCalledTimes(1);
  complete(new Uint8Array([42]));
  expect(await first).toEqual(new Uint8Array([42]));
});

it('checks and proves in one worker job, retaining the check stage while material loads', async () => {
  const { handle, port } = pair();
  let finishCheck!: () => void;
  const checked = new Promise<void>(resolve => {
    finishCheck = resolve;
  });
  let finishProof!: () => void;
  const proven = new Promise<void>(resolve => {
    finishProof = resolve;
  });
  const calls: string[] = [];
  serveProofWorker(port, async () => progress => ({
    check: async () => {
      calls.push('check');
      await checked;
      return [];
    },
    prove: async () => {
      calls.push('prove');
      progress({ phase: 'proof-material', status: 'started' });
      await proven;
      return new Uint8Array([9]);
    },
  }));
  const jobs = createProofJobs({
    createWorker: () => createProofWorker(handle),
  });
  const observe = vi.fn<ProofJobObserver>();
  const client = createProverClient({
    ensure: async () => {},
    release: async () => {},
    intervalMs: 1,
    send: async command => roundTrip(await jobs.handle(roundTrip(command))),
  }).provider(undefined, undefined, observe);
  const result = client.checkAndProve(circuit);
  await vi.waitFor(() => {
    expect(observe).toHaveBeenCalledWith(expect.any(String), 'running', {
      phase: 'checking',
      status: 'started',
    });
  });
  expect(calls).toEqual(['check']);
  finishCheck();
  await vi.waitFor(() => {
    expect(observe).toHaveBeenCalledWith(expect.any(String), 'running', {
      phase: 'proving',
      status: 'started',
    });
  });
  expect(calls).toEqual(['check', 'prove']);
  finishProof();
  expect(await result).toEqual(new Uint8Array([9]));
  expect(new Set(observe.mock.calls.map(([id]) => id)).size).toBe(1);
});

it('never proves after a failed combined check and can process the next job', async () => {
  const { handle, port } = pair();
  const check = vi
    .fn()
    .mockRejectedValueOnce(new Error('Invalid witness'))
    .mockResolvedValue([]);
  const prove = vi.fn(async () => new Uint8Array([9]));
  serveProofWorker(port, async () => () => ({ check, prove }));
  const worker = createProofWorker(handle);
  await expect(
    worker.run({ method: 'checkAndProve', circuit }, () => {}),
  ).rejects.toThrow('Invalid witness');
  expect(prove).not.toHaveBeenCalled();
  expect(
    await worker.run({ method: 'checkAndProve', circuit }, () => {}),
  ).toEqual(new Uint8Array([9]));
  expect(prove).toHaveBeenCalledTimes(1);
});

it('cancels through both JSON hops, terminates the worker and continues queued work', async () => {
  const handles: ReturnType<typeof pair>['handle'][] = [];
  const inner = createProofJobs({
    idleMs: 0,
    createWorker: () => {
      const { handle, port } = pair();
      handles.push(handle);
      serveProofWorker(port, async () => () => ({
        check: async () => [],
        prove: async request =>
          request.keyLocation === 'blocked'
            ? new Promise<Uint8Array>(() => {})
            : request.serializedPreimage,
      }));
      return createProofWorker(handle);
    },
  });
  const backend = createProverClient({
    ensure: async () => {},
    release: async () => {},
    intervalMs: 0,
    send: async command => roundTrip(await inner.handle(roundTrip(command))),
  });
  const outer = createProofJobs({ idleMs: 0 });
  const client = createProverClient({
    ensure: async () => {},
    release: async () => {},
    intervalMs: 0,
    send: async command =>
      roundTrip(
        await outer.handle(roundTrip(command), 'dapp', backend.provider()),
      ),
  });
  const cancellation = new AbortController();
  const first = client
    .provider()
    .prove({ ...circuit, keyLocation: 'blocked' }, cancellation.signal);
  const failure = expect(first).rejects.toThrow('Proof cancelled');
  await vi.waitFor(() => {
    expect(handles).toHaveLength(1);
  });
  const next = client.provider().prove(circuit);
  cancellation.abort();
  await failure;
  await expect(next).resolves.toEqual(circuit.serializedPreimage);
  expect(handles[0].terminate).toHaveBeenCalledTimes(1);
  expect(handles).toHaveLength(2);
});

it('does not start proving when cancellation arrives as checking completes', async () => {
  const abort = new AbortController();
  const provider = {
    check: async () => {
      abort.abort(new Error('Proof cancelled'));
      return [];
    },
    prove: vi.fn(async () => new Uint8Array()),
  };
  await expect(
    executeCircuit(
      provider,
      { method: 'checkAndProve', circuit },
      { signal: abort.signal },
    ),
  ).rejects.toThrow('Proof cancelled');
  expect(provider.prove).not.toHaveBeenCalled();
});
