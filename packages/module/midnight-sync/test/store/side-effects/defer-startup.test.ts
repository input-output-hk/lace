import { BehaviorSubject, Observable } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { deferMidnightStartupUntilUnlocked } from '../../../src/store/side-effects/defer-startup';

import type { SideEffect } from '../../../src/context';
import type { LockState } from '@lace-contract/app-lock';
import type { Subscription } from 'rxjs';

const subscriptions: Subscription[] = [];

const setup = (platform = 'web-extension') => {
  const lock$ = new BehaviorSubject<LockState>({ status: 'Locked' });
  const promptOpen$ = new BehaviorSubject(true);
  const active$ = new BehaviorSubject(true);
  const stop = vi.fn();
  const watch = vi.fn(() => new Observable<never>(() => stop));
  const actions = {} as Parameters<SideEffect>[0];
  const state = {
    appLock: { selectLockState$: lock$ },
    authenticationPrompt: { isOpen$: promptOpen$ },
  } as unknown as Parameters<SideEffect>[1];
  const dependencies = {
    runtime: { platform },
    isWalletActive$: active$,
    logger: dummyLogger,
  } as unknown as Parameters<SideEffect>[2];
  const subscription = deferMidnightStartupUntilUnlocked(watch)(
    actions,
    state,
    dependencies,
  ).subscribe();
  subscriptions.push(subscription);
  return { lock$, promptOpen$, active$, watch, stop, subscription };
};

describe('defer Midnight startup until unlocked', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    subscriptions.splice(0).forEach(subscription => {
      subscription.unsubscribe();
    });
    vi.useRealTimers();
  });

  it('does not start restoration behind the lock prompt even when background polling is enabled', () => {
    const { lock$, promptOpen$, watch } = setup();
    vi.advanceTimersByTime(1000);
    expect(watch).not.toHaveBeenCalled();
    lock$.next({ status: 'Unlocked' });
    vi.advanceTimersByTime(1000);
    expect(watch).not.toHaveBeenCalled();
    promptOpen$.next(false);
    vi.advanceTimersByTime(249);
    expect(watch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(watch).toHaveBeenCalledOnce();
  });

  it('also waits for unlock when the prompt closes before the lock state changes', () => {
    const { lock$, promptOpen$, watch } = setup();
    promptOpen$.next(false);
    vi.advanceTimersByTime(1000);
    expect(watch).not.toHaveBeenCalled();
    lock$.next({ status: 'Unlocked' });
    vi.advanceTimersByTime(250);
    expect(watch).toHaveBeenCalledOnce();
  });

  it('cancels the scheduling window if authentication reopens or the app relocks', () => {
    const { lock$, promptOpen$, watch } = setup();
    lock$.next({ status: 'Unlocked' });
    promptOpen$.next(false);
    vi.advanceTimersByTime(200);
    promptOpen$.next(true);
    vi.advanceTimersByTime(1000);
    expect(watch).not.toHaveBeenCalled();
    promptOpen$.next(false);
    vi.advanceTimersByTime(200);
    lock$.next({ status: 'Locked' });
    vi.advanceTimersByTime(1000);
    expect(watch).not.toHaveBeenCalled();
    lock$.next({ status: 'Unlocked' });
    vi.advanceTimersByTime(250);
    expect(watch).toHaveBeenCalledOnce();
  });

  it('does not restart a running watcher for subsequent signing prompts or lock when pausing is disabled', () => {
    const { lock$, promptOpen$, watch, stop } = setup();
    lock$.next({ status: 'Unlocked' });
    promptOpen$.next(false);
    vi.advanceTimersByTime(250);
    promptOpen$.next(true);
    lock$.next({ status: 'Locked' });
    vi.advanceTimersByTime(1000);
    expect(stop).not.toHaveBeenCalled();
    promptOpen$.next(false);
    lock$.next({ status: 'Unlocked' });
    vi.advanceTimersByTime(250);
    expect(watch).toHaveBeenCalledOnce();
  });

  it('tears down on pause and waits again on resume', () => {
    const { lock$, promptOpen$, active$, watch, stop } = setup();
    lock$.next({ status: 'Unlocked' });
    promptOpen$.next(false);
    vi.advanceTimersByTime(250);
    active$.next(false);
    expect(stop).toHaveBeenCalledOnce();
    lock$.next({ status: 'Locked' });
    promptOpen$.next(true);
    active$.next(true);
    vi.advanceTimersByTime(1000);
    expect(watch).toHaveBeenCalledOnce();
    lock$.next({ status: 'Unlocked' });
    promptOpen$.next(false);
    vi.advanceTimersByTime(249);
    expect(watch).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(1);
    expect(watch).toHaveBeenCalledTimes(2);
  });

  it('cancels a pending start on teardown', () => {
    const { lock$, promptOpen$, subscription, watch } = setup();
    lock$.next({ status: 'Unlocked' });
    promptOpen$.next(false);
    vi.advanceTimersByTime(100);
    subscription.unsubscribe();
    vi.advanceTimersByTime(1000);
    expect(watch).not.toHaveBeenCalled();
  });

  it('allows onboarding to proceed without an existing lock', () => {
    const { lock$, promptOpen$, watch } = setup();
    lock$.next({ status: 'AwaitingSetup' });
    promptOpen$.next(false);
    vi.advanceTimersByTime(250);
    expect(watch).toHaveBeenCalledOnce();
  });

  it('does not gate other platforms on the extension prompt', () => {
    const { watch } = setup('ios');
    expect(watch).toHaveBeenCalledOnce();
  });
});
