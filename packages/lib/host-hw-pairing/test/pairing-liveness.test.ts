import { request } from '@lace-lib/extension-shell-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { probePairingWindow, watchPairingWindow } from '../src';

import type { LaceResult } from '@lace-lib/extension-shell-api';
import type { Mock } from 'vitest';

vi.mock('@lace-lib/extension-shell-client', () => ({
  request: vi.fn(),
}));

const mockRequest = request as Mock;
const answerProbe = (result: LaceResult<{ mounted: boolean }>) => {
  mockRequest.mockResolvedValue(result);
};

const INTERVAL_MS = 10;

/** Advance past `ticks` poll intervals, draining the microtasks each awaited
 * probe leaves behind (a bare advanceTimersByTime would run the timers without
 * ever resolving the promises between them). */
const runTicks = async (ticks: number): Promise<void> => {
  for (let tick = 0; tick < ticks; tick += 1) {
    await vi.advanceTimersByTimeAsync(INTERVAL_MS);
  }
};

describe('probePairingWindow', () => {
  afterEach(() => {
    mockRequest.mockReset();
  });

  it('asks observe-only, so the probe never opens a pairing window itself', async () => {
    answerProbe({ ok: true, value: { mounted: true } });

    await probePairingWindow();

    expect(mockRequest).toHaveBeenCalledWith('wallets.requestConnectHardware', {
      probe: true,
    });
  });

  it('reports the mounted flag the host answers with', async () => {
    answerProbe({ ok: true, value: { mounted: true } });
    expect(await probePairingWindow()).toBe(true);

    answerProbe({ ok: true, value: { mounted: false } });
    expect(await probePairingWindow()).toBe(false);
  });

  it('reports no evidence when the request is refused or unavailable', async () => {
    answerProbe({ ok: false, error: { code: 'unavailable', message: 'no' } });

    expect(await probePairingWindow()).toBe(false);
  });
});

describe('watchPairingWindow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires once the window has been seen open and then gone', async () => {
    const probe = vi
      .fn<() => Promise<boolean>>()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValue(false);
    const onClosed = vi.fn();

    watchPairingWindow(probe, onClosed, INTERVAL_MS);

    await runTicks(2);
    expect(onClosed).not.toHaveBeenCalled();

    await runTicks(1);
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it('stops polling after firing', async () => {
    const probe = vi
      .fn<() => Promise<boolean>>()
      .mockResolvedValueOnce(true)
      .mockResolvedValue(false);
    const onClosed = vi.fn();

    watchPairingWindow(probe, onClosed, INTERVAL_MS);
    await runTicks(2);
    const callsAtClose = probe.mock.calls.length;

    await runTicks(5);
    expect(probe.mock.calls.length).toBe(callsAtClose);
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it('never fires while unarmed, so the gap before the window appears is not a cancellation', async () => {
    const probe = vi.fn<() => Promise<boolean>>().mockResolvedValue(false);
    const onClosed = vi.fn();

    watchPairingWindow(probe, onClosed, INTERVAL_MS);
    await runTicks(20);

    expect(onClosed).not.toHaveBeenCalled();
    expect(probe.mock.calls.length).toBeGreaterThan(1);
  });

  it('stays unarmed when the first probes reject, so an erroring host is not a close', async () => {
    const probe = vi
      .fn<() => Promise<boolean>>()
      .mockRejectedValue(new Error('service worker restarting'));
    const onClosed = vi.fn();

    watchPairingWindow(probe, onClosed, INTERVAL_MS);
    await runTicks(5);

    expect(onClosed).not.toHaveBeenCalled();
    expect(probe.mock.calls.length).toBeGreaterThan(1);
  });

  it('keeps waiting when an armed probe rejects, then fires on the next real close', async () => {
    const probe = vi
      .fn<() => Promise<boolean>>()
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error('service worker restarting'))
      .mockResolvedValue(false);
    const onClosed = vi.fn();

    watchPairingWindow(probe, onClosed, INTERVAL_MS);

    await runTicks(2);
    expect(onClosed).not.toHaveBeenCalled();

    await runTicks(1);
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it('cancel stops the poll and suppresses a close observed in flight', async () => {
    const probe = vi
      .fn<() => Promise<boolean>>()
      .mockResolvedValueOnce(true)
      .mockResolvedValue(false);
    const onClosed = vi.fn();

    const cancel = watchPairingWindow(probe, onClosed, INTERVAL_MS);
    await runTicks(1);
    cancel();
    await runTicks(5);

    expect(onClosed).not.toHaveBeenCalled();
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it('cancel discards a close that a probe already in flight goes on to report', async () => {
    let settleInFlightProbe: ((isOpen: boolean) => void) | undefined;
    const probe = vi
      .fn<() => Promise<boolean>>()
      .mockResolvedValueOnce(true)
      .mockImplementationOnce(
        async () =>
          new Promise<boolean>(resolve => {
            settleInFlightProbe = resolve;
          }),
      );
    const onClosed = vi.fn();

    const cancel = watchPairingWindow(probe, onClosed, INTERVAL_MS);
    await runTicks(2);
    cancel();
    settleInFlightProbe?.(false);
    await runTicks(1);

    expect(onClosed).not.toHaveBeenCalled();
  });
});
