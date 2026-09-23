import {
  AccAddress,
  DeviceEntryNotFoundError,
  UseCounter,
} from '@lace-contract/passport';
import { HexBytes } from '@lace-lib/util';
import { describe, expect, it, vi } from 'vitest';

import { resolveUseCounter } from '../../src/acc/use-counter';

const address = AccAddress('ac'.repeat(32));
const deviceEpoch = 3n;

const commitmentFor = (counter: bigint): string =>
  counter.toString(16).padStart(64, '0');

const createTestContext = (liveCounters: bigint[]) => {
  const live = new Set(liveCounters.map(commitmentFor));
  const authoriser = {
    scheme: 'jubjub-schnorr' as const,
    devicePublicKey: vi.fn(),
    deviceCommitment: vi.fn(
      async (_account: unknown, _epoch: unknown, counter: bigint) =>
        commitmentFor(counter),
    ),
    authorise: vi.fn(),
  };
  const ledgerState = {
    device_epoch: deviceEpoch,
    devices: {
      member: vi.fn((entry: Uint8Array) =>
        live.has(HexBytes.fromByteArray(entry)),
      ),
    },
  };
  return { authoriser, ledgerState };
};

const createBatchedTestContext = (liveCounters: bigint[]) => {
  const context = createTestContext(liveCounters);
  const deviceCommitments = vi.fn(
    async (_account: unknown, _epoch: unknown, counters: readonly bigint[]) =>
      counters.map(commitmentFor),
  );
  return {
    ...context,
    deviceCommitments,
    authoriser: { ...context.authoriser, deviceCommitments },
  };
};

describe('resolveUseCounter', () => {
  it('finds the entry at counter 0 for a fresh device', async () => {
    const { authoriser, ledgerState } = createTestContext([0n]);

    await expect(
      resolveUseCounter({
        ledgerState,
        authoriser: authoriser as never,
        address,
      }),
    ).resolves.toEqual({
      useCounter: 0n,
      commitmentHex: commitmentFor(0n),
    });
    expect(authoriser.deviceCommitment).toHaveBeenCalledExactlyOnceWith(
      address,
      deviceEpoch,
      0n,
    );
  });

  it('rescans forward from the known counter when the roster is stale', async () => {
    const { authoriser, ledgerState } = createTestContext([5n]);

    await expect(
      resolveUseCounter({
        ledgerState,
        authoriser: authoriser as never,
        address,
        knownUseCounter: UseCounter(2n),
      }),
    ).resolves.toEqual({
      useCounter: 5n,
      commitmentHex: commitmentFor(5n),
    });
    expect(authoriser.deviceCommitment).toHaveBeenCalledTimes(4);
    expect(authoriser.deviceCommitment).toHaveBeenNthCalledWith(
      1,
      address,
      deviceEpoch,
      2n,
    );
    expect(authoriser.deviceCommitment).toHaveBeenNthCalledWith(
      4,
      address,
      deviceEpoch,
      5n,
    );
  });

  it('never probes counters behind the known counter', async () => {
    const { authoriser, ledgerState } = createTestContext([1n, 4n]);

    await expect(
      resolveUseCounter({
        ledgerState,
        authoriser: authoriser as never,
        address,
        knownUseCounter: UseCounter(2n),
      }),
    ).resolves.toMatchObject({ useCounter: 4n });
  });

  it('probes the counters below the anchor once the window above it misses', async () => {
    const { authoriser, ledgerState } = createTestContext([3n]);

    await expect(
      resolveUseCounter({
        ledgerState,
        authoriser: authoriser as never,
        address,
        knownUseCounter: UseCounter(500n),
      }),
    ).resolves.toEqual({
      useCounter: 3n,
      commitmentHex: commitmentFor(3n),
    });
    expect(authoriser.deviceCommitment).toHaveBeenCalledTimes(4100);
    expect(authoriser.deviceCommitment).toHaveBeenNthCalledWith(
      4097,
      address,
      deviceEpoch,
      0n,
    );
  });

  it('searches the window above the anchor before the counters below it', async () => {
    const { authoriser, ledgerState } = createTestContext([3n, 600n]);

    await expect(
      resolveUseCounter({
        ledgerState,
        authoriser: authoriser as never,
        address,
        knownUseCounter: UseCounter(500n),
      }),
    ).resolves.toMatchObject({ useCounter: 600n });
    expect(authoriser.deviceCommitment).toHaveBeenCalledTimes(101);
  });

  it('errors when no entry is found in either pass', async () => {
    const { authoriser, ledgerState } = createTestContext([]);

    await expect(
      resolveUseCounter({
        ledgerState,
        authoriser: authoriser as never,
        address,
        knownUseCounter: UseCounter(10n),
      }),
    ).rejects.toThrow(DeviceEntryNotFoundError);
    expect(authoriser.deviceCommitment).toHaveBeenCalledTimes(4106);
  });

  it('errors when no entry is found within the rescan window', async () => {
    const { authoriser, ledgerState } = createTestContext([]);

    await expect(
      resolveUseCounter({
        ledgerState,
        authoriser: authoriser as never,
        address,
      }),
    ).rejects.toThrow(DeviceEntryNotFoundError);
    expect(authoriser.deviceCommitment).toHaveBeenCalledTimes(4096);
  });

  it('errors on an entry sitting just past the rescan window', async () => {
    const { authoriser, ledgerState } = createTestContext([4098n]);

    await expect(
      resolveUseCounter({
        ledgerState,
        authoriser: authoriser as never,
        address,
        knownUseCounter: UseCounter(2n),
      }),
    ).rejects.toThrow(DeviceEntryNotFoundError);
  });

  describe('with an authoriser exposing deviceCommitments', () => {
    it('finds the entry at counter 0 with a single batch', async () => {
      const { authoriser, deviceCommitments, ledgerState } =
        createBatchedTestContext([0n]);

      await expect(
        resolveUseCounter({
          ledgerState,
          authoriser: authoriser as never,
          address,
        }),
      ).resolves.toEqual({
        useCounter: 0n,
        commitmentHex: commitmentFor(0n),
      });
      expect(deviceCommitments).toHaveBeenCalledTimes(1);
      expect(deviceCommitments).toHaveBeenCalledWith(
        address,
        deviceEpoch,
        Array.from({ length: 64 }, (_, index) => BigInt(index)),
      );
      expect(authoriser.deviceCommitment).not.toHaveBeenCalled();
    });

    it('finds an entry beyond the first chunk with one batch per chunk', async () => {
      const { authoriser, deviceCommitments, ledgerState } =
        createBatchedTestContext([100n]);

      await expect(
        resolveUseCounter({
          ledgerState,
          authoriser: authoriser as never,
          address,
        }),
      ).resolves.toEqual({
        useCounter: 100n,
        commitmentHex: commitmentFor(100n),
      });
      expect(deviceCommitments).toHaveBeenCalledTimes(2);
      expect(deviceCommitments).toHaveBeenNthCalledWith(
        2,
        address,
        deviceEpoch,
        Array.from({ length: 64 }, (_, index) => 64n + BigInt(index)),
      );
    });

    it('tests candidates in order so the earliest live entry wins', async () => {
      const { authoriser, ledgerState } = createBatchedTestContext([7n, 5n]);

      await expect(
        resolveUseCounter({
          ledgerState,
          authoriser: authoriser as never,
          address,
        }),
      ).resolves.toMatchObject({ useCounter: 5n });
    });

    it('starts the batched rescan at the known counter', async () => {
      const { authoriser, deviceCommitments, ledgerState } =
        createBatchedTestContext([5n]);

      await expect(
        resolveUseCounter({
          ledgerState,
          authoriser: authoriser as never,
          address,
          knownUseCounter: UseCounter(2n),
        }),
      ).resolves.toMatchObject({ useCounter: 5n });
      expect(deviceCommitments.mock.calls[0][2][0]).toBe(2n);
    });

    it('probes the counters below the anchor in chunks once the window above it misses', async () => {
      const { authoriser, deviceCommitments, ledgerState } =
        createBatchedTestContext([3n]);

      await expect(
        resolveUseCounter({
          ledgerState,
          authoriser: authoriser as never,
          address,
          knownUseCounter: UseCounter(500n),
        }),
      ).resolves.toEqual({
        useCounter: 3n,
        commitmentHex: commitmentFor(3n),
      });
      expect(deviceCommitments).toHaveBeenCalledTimes(65);
      expect(deviceCommitments.mock.calls[0][2][0]).toBe(500n);
      expect(deviceCommitments.mock.calls[64][2][0]).toBe(0n);
    });

    it('searches the window above the anchor before the counters below it', async () => {
      const { authoriser, deviceCommitments, ledgerState } =
        createBatchedTestContext([3n, 600n]);

      await expect(
        resolveUseCounter({
          ledgerState,
          authoriser: authoriser as never,
          address,
          knownUseCounter: UseCounter(500n),
        }),
      ).resolves.toMatchObject({ useCounter: 600n });
      expect(deviceCommitments).toHaveBeenCalledTimes(2);
    });

    it('errors after probing both passes in chunks', async () => {
      const { authoriser, deviceCommitments, ledgerState } =
        createBatchedTestContext([]);

      await expect(
        resolveUseCounter({
          ledgerState,
          authoriser: authoriser as never,
          address,
          knownUseCounter: UseCounter(500n),
        }),
      ).rejects.toThrow(DeviceEntryNotFoundError);
      expect(deviceCommitments).toHaveBeenCalledTimes(72);
      expect(ledgerState.devices.member).toHaveBeenCalledTimes(4596);
    });

    it('errors after probing the full window in chunks', async () => {
      const { authoriser, deviceCommitments, ledgerState } =
        createBatchedTestContext([]);

      await expect(
        resolveUseCounter({
          ledgerState,
          authoriser: authoriser as never,
          address,
        }),
      ).rejects.toThrow(DeviceEntryNotFoundError);
      expect(deviceCommitments).toHaveBeenCalledTimes(64);
      expect(ledgerState.devices.member).toHaveBeenCalledTimes(4096);
    });

    it('errors on an entry sitting just past the rescan window', async () => {
      const { authoriser, ledgerState } = createBatchedTestContext([4098n]);

      await expect(
        resolveUseCounter({
          ledgerState,
          authoriser: authoriser as never,
          address,
          knownUseCounter: UseCounter(2n),
        }),
      ).rejects.toThrow(DeviceEntryNotFoundError);
    });
  });
});
