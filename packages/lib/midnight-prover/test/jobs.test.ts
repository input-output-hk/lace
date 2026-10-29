import { describe, expect, it, vi } from 'vitest';

import { createByteClient } from '../src/bytes';
import { createProofJobs } from '../src/jobs';
import { encodeRequest } from '../src/protocol';

import type { JobResult, ProverCommand } from '../src/protocol';

const setup = () => {
  let complete!: (result: JobResult) => void;
  let fail!: (reason: Error) => void;
  let now = 0;
  const run = vi.fn(
    async () =>
      new Promise<JobResult>((resolve, reject) => {
        complete = resolve;
        fail = reject;
      }),
  );
  const dispose = vi.fn(() => {
    fail(new Error('Worker terminated'));
  });
  const createWorker = vi.fn(() => ({ run, dispose }));
  const jobs = createProofJobs({
    createWorker,
    now: () => now,
    retentionMs: 100,
    idleMs: 100,
    capacity: 3,
    byteLimits: { retentionMs: 100 },
  });
  const send = async (id: string, operation: 'cancel' | 'poll' | 'release') => {
    const reply = await jobs.handle({
      target: 'lace:prover',
      version: 2,
      id,
      operation,
    });
    if (!reply.ok) throw new Error(reply.error);
    if (!('job' in reply)) throw new Error('Expected job');
    return reply.job;
  };
  const start = async (id: string) => {
    const bytes = createByteClient(async operation => {
      const reply = await jobs.handle({
        target: 'lace:prover',
        version: 2,
        id,
        ...operation,
      });
      if (!reply.ok || !('bytes' in reply)) throw new Error('Upload failed');
      return reply.bytes;
    });
    const request = await encodeRequest(
      {
        method: 'check',
        circuit: {
          serializedPreimage: new Uint8Array([1]),
          keyLocation: 'test',
        },
      },
      bytes.upload,
    );
    return jobs.handle({
      target: 'lace:prover',
      version: 2,
      id,
      operation: 'start',
      request,
    });
  };
  return {
    jobs,
    run,
    dispose,
    createWorker,
    start,
    send,
    complete: (result: JobResult) => {
      complete(result);
    },
    fail: () => {
      fail(new Error('OOM'));
    },
    advance: () => {
      now += 101;
    },
  };
};
const settle = async () => {
  await new Promise(resolve => setTimeout(resolve, 0));
};

describe('offscreen proof jobs', () => {
  it('replaces a failed worker before processing an already queued proof', async () => {
    const { start, send, fail, complete, createWorker, dispose } = setup();
    await start('failed');
    await start('queued');
    expect((await send('queued', 'poll')).status).toBe('queued');
    fail();
    await settle();
    expect((await send('failed', 'poll')).status).toBe('failed');
    expect((await send('queued', 'poll')).status).toBe('running');
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(createWorker).toHaveBeenCalledTimes(2);
    complete([8n, undefined]);
    await settle();
    expect(await send('queued', 'poll')).toMatchObject({
      status: 'succeeded',
      result: { ordinals: ['8', null] },
    });
    expect((await send('failed', 'poll')).status).toBe('failed');
  });
  it('serializes computation, deduplicates starts and retains a result for reconnect', async () => {
    const { start, send, run, complete } = setup();
    await start('a');
    await start('a');
    await start('b');
    expect(run).toHaveBeenCalledTimes(1);
    expect((await send('b', 'poll')).status).toBe('queued');
    complete([9n, undefined]);
    await settle();
    expect(run).toHaveBeenCalledTimes(2);
    expect(await send('a', 'poll')).toMatchObject({
      status: 'succeeded',
      result: { ordinals: ['9', null] },
    });
    await send('a', 'release');
    await expect(send('a', 'poll')).rejects.toThrow('no longer available');
  });
  it('cancels a blocked worker and starts queued work with a fresh worker', async () => {
    const { start, send, dispose, createWorker } = setup();
    await start('a');
    await start('b');
    expect((await send('a', 'cancel')).status).toBe('cancelled');
    expect(dispose).toHaveBeenCalled();
    await settle();
    expect(createWorker).toHaveBeenCalledTimes(2);
    expect((await send('b', 'poll')).status).toBe('running');
  });
  it('cancels queued work without stopping the current proof', async () => {
    const { start, send, dispose } = setup();
    await start('a');
    await start('b');
    await send('b', 'cancel');
    expect(dispose).not.toHaveBeenCalled();
    expect((await send('a', 'poll')).status).toBe('running');
  });
  it('records worker death and allows subsequent work', async () => {
    const { start, send, fail, createWorker } = setup();
    await start('a');
    fail();
    await settle();
    expect(await send('a', 'poll')).toMatchObject({
      status: 'failed',
      error: 'OOM',
    });
    await start('b');
    expect(createWorker).toHaveBeenCalledTimes(2);
  });
  it('bounds the queue and expires terminal records while preserving running work', async () => {
    const { start, send, advance, complete, jobs } = setup();
    for (const id of ['a', 'b', 'c']) await start(id);
    expect(await start('d')).toEqual({
      ok: false,
      error: 'Proof queue is full',
    });
    await send('d', 'release');
    advance();
    expect(jobs.isActive()).toBe(true);
    complete([]);
    await settle();
    advance();
    jobs.isActive();
    await expect(send('a', 'poll')).rejects.toThrow('no longer available');
    expect((await send('b', 'poll')).status).toBe('running');
  });
  it('keeps cached material briefly then frees worker and bytes', async () => {
    const { start, send, complete, advance, jobs, dispose } = setup();
    await start('a');
    complete([]);
    await settle();
    await send('a', 'release');
    expect(jobs.isActive()).toBe(true);
    expect(dispose).not.toHaveBeenCalled();
    advance();
    expect(jobs.isActive()).toBe(false);
    expect(dispose).toHaveBeenCalledTimes(1);
  });
  it('rejects malformed handles and foreign job access', async () => {
    const { jobs, start } = setup();
    expect(
      (
        await jobs.handle({
          target: 'lace:prover',
          version: 2,
          id: 'bad',
          operation: 'start',
          request: {
            method: 'check',
            circuit: {
              keyLocation: 'bad',
              serializedPreimage: { id: 'unknown', size: 0, digest: '' },
            },
          },
        } as ProverCommand)
      ).ok,
    ).toBe(false);
    await start('a');
    expect(
      (
        await jobs.handle(
          { target: 'lace:prover', version: 2, id: 'a', operation: 'poll' },
          'other-document',
        )
      ).ok,
    ).toBe(false);
  });
});

describe('forwarding providers with their own queue', () => {
  it('forwards both requests without coupling their failures', async () => {
    const jobs = createProofJobs({ shouldForwardProvidersConcurrently: true });
    let fail!: (error: Error) => void;
    let complete!: (result: (bigint | undefined)[]) => void;
    const provider = {
      check: vi
        .fn()
        .mockImplementationOnce(
          async () =>
            new Promise((_resolve, reject) => {
              fail = reject;
            }),
        )
        .mockImplementationOnce(
          async () =>
            new Promise(resolve => {
              complete = resolve;
            }),
        ),
      prove: vi.fn(),
    };
    const send = async (id: string, operation: 'poll' | 'release') =>
      jobs.handle({ target: 'lace:prover', version: 2, id, operation });
    const start = async (id: string) => {
      const client = createByteClient(async operation => {
        const reply = await jobs.handle({
          target: 'lace:prover',
          version: 2,
          id,
          ...operation,
        });
        if (!reply.ok || !('bytes' in reply)) throw new Error('Upload failed');
        return reply.bytes;
      });
      const request = await encodeRequest(
        {
          method: 'check',
          circuit: {
            serializedPreimage: new Uint8Array([1]),
            keyLocation: 'test',
          },
        },
        client.upload,
      );
      return jobs.handle(
        { target: 'lace:prover', version: 2, id, operation: 'start', request },
        'extension',
        provider,
      );
    };
    await start('first');
    await start('second');
    expect(provider.check).toHaveBeenCalledTimes(2);
    fail(new Error('Worker failed'));
    await settle();
    expect(await send('first', 'poll')).toMatchObject({
      ok: true,
      job: { status: 'failed' },
    });
    expect(await send('second', 'poll')).toMatchObject({
      ok: true,
      job: { status: 'running' },
    });
    complete([42n]);
    await settle();
    expect(await send('second', 'poll')).toMatchObject({
      ok: true,
      job: { status: 'succeeded', result: { ordinals: ['42'] } },
    });
  });
});
