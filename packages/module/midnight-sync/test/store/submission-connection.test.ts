import { EventEmitter } from 'node:events';

import { createProgressSubmissionService } from '@lace-lib/vendor/midnight-submission-service';
import { PolkadotNodeClient } from '@midnightntwrk/wallet-sdk/node-client/effect';
import { Duration, Effect } from 'effect';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { FinalizedTransaction } from '@midnight-ntwrk/ledger-v8';
import type { ApiPromise } from '@polkadot/api';

// Keep the SDK client and stream real; emulate the browser's asynchronous close.
const setup = () => {
  const events = new EventEmitter();
  let isClosing = false;
  let finishClose: (() => void) | undefined;
  const send = vi.fn(async (callback: (result: unknown) => Promise<void>) => {
    if (isClosing)
      throw new Error('WebSocket is already in CLOSING or CLOSED state');
    await callback({ status: { isReady: true }, txHash: 'fixture' });
    return () => undefined;
  });
  const api = Object.assign(events, {
    isConnected: true,
    connect: vi.fn(async () => {
      api.isConnected = true;
    }),
    disconnect: vi.fn(async () => {
      if (!api.isConnected || isClosing) return;
      isClosing = true;
      finishClose = () => {
        isClosing = false;
        api.isConnected = false;
        events.emit('disconnected');
      };
    }),
    tx: { midnight: { sendMnTransaction: () => ({ send }) } },
  });
  const make = vi.spyOn(PolkadotNodeClient, 'make').mockReturnValue(
    Effect.acquireRelease(
      Effect.promise(async () => {
        // SDK make() requests this close before returning its client.
        await api.disconnect();
        return new PolkadotNodeClient(
          {
            nodeURL: new URL('ws://localhost:9944'),
            reconnectionDelay: Duration.millis(1),
            reconnectionTimeout: Duration.seconds(1),
          },
          api as unknown as ApiPromise,
        );
      }),
      () => Effect.promise(async () => api.disconnect()),
    ),
  );
  const service = createProgressSubmissionService({
    relayURL: new URL('ws://localhost:9944'),
  });
  const submit = async () =>
    service.submitTransaction(
      { serialize: () => new Uint8Array([1]) } as FinalizedTransaction,
      'Submitted',
    );
  return {
    api,
    service,
    submit,
    send,
    make,
    finishClose: () => finishClose?.(),
  };
};

describe('SDK submission connection lifecycle', () => {
  afterEach(() => vi.restoreAllMocks());

  it('waits for the metadata socket to close before the first submission', async () => {
    const context = setup();
    const result = context.submit();
    // Capture rejection immediately so the regression has no unhandled promise.
    const outcome = result.then(
      value => value,
      (error: unknown) => error,
    );
    await vi.waitFor(() => {
      expect(
        context.send.mock.calls.length +
          context.api.listenerCount('disconnected'),
      ).toBeGreaterThan(0);
    });
    expect(context.send).not.toHaveBeenCalled();
    context.finishClose();
    await vi.waitFor(() => {
      expect(context.send).toHaveBeenCalledTimes(1);
    });
    context.finishClose();
    expect(await outcome).toMatchObject({ _tag: 'Submitted' });
    await context.service.close();
    expect(context.api.listenerCount('disconnected')).toBe(0);
  });

  it('does not share a closing socket between simultaneous submissions', async () => {
    const context = setup();
    const first = context.submit().catch((error: unknown) => error);
    const second = context.submit().catch((error: unknown) => error);
    await vi.waitFor(() => {
      expect(
        context.send.mock.calls.length +
          context.api.listenerCount('disconnected'),
      ).toBeGreaterThan(0);
    });
    context.finishClose();
    await vi.waitFor(() => {
      expect(context.send).toHaveBeenCalledTimes(1);
    });
    context.finishClose();
    expect(await first).toMatchObject({ _tag: 'Submitted' });
    await vi.waitFor(() => {
      expect(context.send).toHaveBeenCalledTimes(2);
    });
    context.finishClose();
    expect(await second).toMatchObject({ _tag: 'Submitted' });
    expect(context.make).toHaveBeenCalledTimes(1);
    await context.service.close();
  });

  it('releases the connection after a failed send so a manual retry can reconnect', async () => {
    const context = setup();
    context.send.mockRejectedValueOnce(new Error('Network submission failed'));
    const failure = context.submit().catch((error: unknown) => error);
    await vi.waitFor(() => {
      expect(context.api.listenerCount('disconnected')).toBe(1);
    });
    context.finishClose();
    await vi.waitFor(() => {
      expect(context.api.disconnect).toHaveBeenCalledTimes(2);
    });
    context.finishClose();
    expect(await failure).toBeInstanceOf(Error);
    expect(context.send).toHaveBeenCalledTimes(1);
    const retry = context.submit();
    await vi.waitFor(() => {
      expect(context.api.disconnect).toHaveBeenCalledTimes(3);
    });
    context.finishClose();
    await expect(retry).resolves.toMatchObject({ _tag: 'Submitted' });
    expect(context.send).toHaveBeenCalledTimes(2);
    await context.service.close();
  });
});
