import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MidnightStartupCoordinator } from '../../src/store/startup-coordinator';

describe('Midnight startup coordination', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('yields between local restores and waits for every account before releasing probes', async () => {
    const coordinator = new MidnightStartupCoordinator();
    const first = coordinator.register();
    const second = coordinator.register();
    const events: string[] = [];
    const a = first.enqueueLocalRestore(() => events.push('restore first'));
    const b = second.enqueueLocalRestore(() => events.push('restore second'));
    expect(events).toEqual([]);
    await vi.advanceTimersByTimeAsync(20);
    await Promise.all([a, b]);
    const firstReady = first
      .finishPreparationAndWaitForPeers()
      .then(() => events.push('probe first'));
    await vi.advanceTimersByTimeAsync(20);
    expect(events).toEqual(['restore first', 'restore second']);
    const secondReady = second
      .finishPreparationAndWaitForPeers()
      .then(() => events.push('probe second'));
    expect(events).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(20);
    await Promise.all([firstReady, secondReady]);
    expect(events).toEqual([
      'restore first',
      'restore second',
      'probe first',
      'probe second',
    ]);
  });

  it('includes an account registered while release is scheduled', async () => {
    const coordinator = new MidnightStartupCoordinator();
    const started = vi.fn();
    const first = coordinator.register();
    const firstReady = first.finishPreparationAndWaitForPeers().then(started);
    const late = coordinator.register();
    await vi.advanceTimersByTimeAsync(20);
    expect(started).not.toHaveBeenCalled();
    const lateReady = late.finishPreparationAndWaitForPeers();
    await vi.advanceTimersByTimeAsync(20);
    await Promise.all([firstReady, lateReady]);
    expect(started).toHaveBeenCalledOnce();
  });

  it('cancels queued restoration without poisoning the queue or blocking siblings', async () => {
    const coordinator = new MidnightStartupCoordinator();
    const cancelled = coordinator.register();
    const sibling = coordinator.register();
    const restore = vi.fn();
    const cancelledWork = cancelled
      .enqueueLocalRestore(restore)
      .catch((error: unknown) => error);
    const siblingWork = sibling.enqueueLocalRestore(() => 'restored');
    cancelled.cancel();
    await vi.advanceTimersByTimeAsync(20);
    expect(await cancelledWork).toEqual(
      new Error('Midnight wallet startup cancelled'),
    );
    expect(restore).not.toHaveBeenCalled();
    expect(await siblingWork).toBe('restored');
    const ready = sibling.finishPreparationAndWaitForPeers();
    await vi.advanceTimersByTimeAsync(20);
    await ready;
  });

  it('rejects cancelled waiters and allows a later startup batch', async () => {
    const coordinator = new MidnightStartupCoordinator();
    const first = coordinator.register();
    const second = coordinator.register();
    const ready = first
      .finishPreparationAndWaitForPeers()
      .catch((error: unknown) => error);
    first.cancel();
    second.cancel();
    expect(await ready).toEqual(new Error('Midnight wallet startup cancelled'));
    const retry = coordinator.register();
    const retryReady = retry.finishPreparationAndWaitForPeers();
    await vi.advanceTimersByTimeAsync(20);
    await retryReady;
  });

  it('does not hold other runtimes behind an unfinished restore', async () => {
    new MidnightStartupCoordinator().register();
    const independent = new MidnightStartupCoordinator()
      .register()
      .finishPreparationAndWaitForPeers();
    await vi.advanceTimersByTimeAsync(20);
    await independent;
  });
});
