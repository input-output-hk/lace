import { describe, expect, it, vi } from 'vitest';

import { createProofActivityStore } from '../src/activity';

import type { ProofActivity, ProofJobObserver } from '../src/activity';

const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

describe('proof activity summaries', () => {
  it('retains independent results and replays them when a UI reconnects', async () => {
    const store = createProofActivityStore();
    let state: ProofActivity[] = [];
    const unsubscribe = store.subscribe(value => {
      state = value;
    });
    const first = deferred();
    const second = deferred();
    const a = store.run('proof', async observe => {
      observe('a', 'running');
      return first.promise;
    });
    const b = store.run('proof', async observe => {
      observe('b', 'queued');
      return second.promise;
    });
    expect(state.map(value => value.status)).toEqual(['running', 'queued']);
    const [idA, idB] = state.map(value => value.id);
    store.dismiss(idA);
    expect(state).toHaveLength(2);
    const rejected = expect(a).rejects.toThrow('worker failed');
    first.reject(new Error('worker failed'));
    await rejected;
    second.resolve();
    await b;
    expect(state.map(value => value.status)).toEqual(['failed', 'succeeded']);
    unsubscribe();
    store.dismiss(idB);
    store.subscribe(value => {
      state = value;
    });
    expect(state).toEqual([
      expect.objectContaining({ id: idA, status: 'failed', number: 1 }),
    ]);
    store.dismiss(idA);
    expect(state).toEqual([]);
  });

  it('groups child jobs until the operation settles and ignores late callbacks', async () => {
    const store = createProofActivityStore();
    let state: ProofActivity[] = [];
    store.subscribe(value => {
      state = value;
    });
    let report!: ProofJobObserver;
    const work = deferred();
    const group = store.run('transaction', async observe => {
      report = observe;
      return work.promise;
    });
    report('a', 'running');
    report('b', 'queued');
    expect(state[0]?.status).toBe('running');
    report('a', 'succeeded');
    expect(state[0]?.status).toBe('queued');
    report('b', 'running');
    report('b', 'succeeded');
    expect(state).toHaveLength(1);
    expect(state[0]?.status).toBe('running');
    work.resolve();
    await group;
    expect(state[0]?.status).toBe('succeeded');
    const id = state[0].id;
    store.dismiss(id);
    report('b', 'failed');
    expect(state).toEqual([]);
  });
});

it('keeps the same activity through receiving, computation and completion', async () => {
  const store = createProofActivityStore();
  let state: ProofActivity[] = [];
  store.subscribe(value => {
    state = value;
  });
  const preparation = store.prepare('proof');
  expect(state[0].status).toBe('receiving');
  const id = state[0].id;
  await preparation.run(async observe => {
    expect(state[0].status).toBe('preparing');
    observe('worker', 'queued');
    expect(state[0].status).toBe('queued');
    observe('worker', 'running');
    preparation.fail();
    expect(state[0].status).toBe('running');
  });
  preparation.fail();
  expect(state).toEqual([expect.objectContaining({ id, status: 'succeeded' })]);
  await expect(preparation.run(async () => {})).rejects.toThrow(
    'preparation has ended',
  );
});

it('retains a failed transfer and refuses to start it later', async () => {
  const store = createProofActivityStore();
  let state: ProofActivity[] = [];
  store.subscribe(value => {
    state = value;
  });
  const preparation = store.prepare('check');
  preparation.fail();
  expect(state[0].status).toBe('failed');
  store.dismiss(state[0].id);
  preparation.fail();
  await expect(preparation.run(async () => {})).rejects.toThrow(
    'preparation has ended',
  );
  expect(state).toEqual([]);
});

it('keeps one activity open across checking and proving and preserves immutable snapshots', async () => {
  const store = createProofActivityStore();
  let state: ProofActivity[] = [];
  store.subscribe(value => {
    state = value;
  });
  const first = store.prepare('proof', true);
  const receiving = state[0];
  await first.run(async observe => {
    observe('job', 'running', { phase: 'checking', status: 'started' });
    expect(state[0].steps?.map(step => step.status)).toEqual([
      'done',
      'running',
      'pending',
    ]);
    observe('job', 'running', { phase: 'checking', status: 'completed' });
    expect(state[0].status).toBe('running');
    observe('job', 'running', { phase: 'proving', status: 'started' });
    expect(state[0].steps?.map(step => step.status)).toEqual([
      'done',
      'done',
      'running',
    ]);
  });
  expect(state).toHaveLength(1);
  expect(state[0].id).toBe(receiving.id);
  expect(state[0].steps?.map(step => step.status)).toEqual([
    'done',
    'done',
    'done',
  ]);
  expect(receiving.steps?.map(step => step.status)).toEqual([
    'running',
    'pending',
    'pending',
  ]);
});

it.each(['checking', 'proving'] as const)(
  'marks only the failing %s step and leaves other activities independent',
  async phase => {
    const store = createProofActivityStore();
    let state: ProofActivity[] = [];
    store.subscribe(value => {
      state = value;
    });
    const first = store.prepare('proof', true);
    const second = store.prepare('proof', true);
    await expect(
      first.run(async observe => {
        observe('job', 'running', { phase, status: 'started' });
        throw new Error('Failure');
      }),
    ).rejects.toThrow('Failure');
    expect(state[0].steps?.find(step => step.id === phase)?.status).toBe(
      'failed',
    );
    if (phase === 'checking')
      expect(state[0].steps?.[2].status).toBe('pending');
    expect(state[1].status).toBe('receiving');
    await second.run(async () => {});
    expect(state.map(activity => activity.status)).toEqual([
      'failed',
      'succeeded',
    ]);
  },
);

it('expires successful activity without a UI and bounds failures without dropping active work', async () => {
  vi.useFakeTimers();
  try {
    const store = createProofActivityStore({ historyLimit: 2 });
    const active = store.prepare('proof');
    await store.run('proof', async () => {});
    await vi.advanceTimersByTimeAsync(5000);
    let state: ProofActivity[] = [];
    const unsubscribe = store.subscribe(value => {
      state = value;
    });
    expect(state.map(activity => activity.status)).toEqual(['receiving']);
    for (let index = 0; index < 4; index++) store.prepare('proof').fail();
    expect(state.map(activity => activity.number)).toEqual([1, 5, 6]);
    await vi.advanceTimersByTimeAsync(60000);
    expect(state.map(activity => activity.status)).toEqual([
      'receiving',
      'failed',
      'failed',
    ]);
    await active.run(async () => {});
    expect(state.map(activity => activity.number)).toEqual([1, 6]);
    await vi.advanceTimersByTimeAsync(5000);
    expect(state.map(activity => activity.number)).toEqual([6]);
    unsubscribe();
  } finally {
    vi.useRealTimers();
  }
});
