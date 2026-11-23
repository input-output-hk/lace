import { DustSecretKey, LedgerParameters } from '@midnightntwrk/ledger-v9';
import {
  InMemoryTransactionHistoryStorage,
  mergeWalletEntries,
  WalletEntrySchema,
} from '@midnightntwrk/wallet-sdk';
import { CoreWallet, Serialization } from '@midnightntwrk/wallet-sdk/dust/v2';
import { ProtocolVersion } from '@midnightntwrk/wallet-sdk-abstractions';
import { describe, expect, it } from 'vitest';

import {
  createDustWallet,
  resolveDustRestoreMode,
  getPendingDustNullifiersForReset,
} from '../../src/store/dust-sync';

import type { MidnightNetworkConfig } from '@lace-contract/midnight-context';
import type { DefaultDustConfiguration } from '@midnightntwrk/wallet-sdk/dust';

const configuration: DefaultDustConfiguration = {
  forks: { v9: ProtocolVersion.ProtocolVersion(2_000_000n) },
  networkId: 'undeployed',
  indexerClientConnection: { indexerHttpUrl: 'http://127.0.0.1:1/graphql' },
  costParameters: { additionalFeeOverhead: 0n, feeBlocksMargin: 0 },
  txHistoryStorage: new InMemoryTransactionHistoryStorage(
    WalletEntrySchema,
    mergeWalletEntries,
  ),
};
const network: MidnightNetworkConfig = {
  indexerAddress: 'http://localhost:8088/api/v4/graphql',
  nodeAddress: 'http://localhost:9944',
  proofServer: { kind: 'in-process' },
};
const explicitDisable = { ...network, dustSyncResetAuthorizations: {} };
const approved = {
  ...network,
  filteredDustSyncIndexer: network.indexerAddress,
  isFilteredDustSyncRolloutEnabled: true,
};
const snapshot = (
  pending = false,
  syncKind: CoreWallet['syncKind'] = 'projections',
) => {
  const key = DustSecretKey.fromSeed(new Uint8Array(32).fill(1));
  try {
    const wallet = CoreWallet.withProtocolVersion(
      CoreWallet.initEmpty(
        LedgerParameters.initialParameters().dust,
        key,
        'undeployed',
      ),
      ProtocolVersion.ProtocolVersion(2_000_000n),
    );
    return Serialization.makeDefaultV2SerializationCapability().serialize({
      ...wallet,
      syncKind,
      progress: {
        ...wallet.progress,
        appliedIndex: 3_446_045n,
        highestIndex: 3_446_045n,
        highestRelevantIndex: 3_446_045n,
        highestRelevantWalletIndex: 3_446_045n,
      },
      pendingDust: pending
        ? [
            {
              coin: {
                initialValue: 1n,
                owner: wallet.publicKey.publicKey,
                nonce: 1n,
                seq: 0,
                ctime: new Date(0),
                backingNight: '00'.repeat(32),
                mtIndex: 0n,
              },
              nullifier: 1n,
              declaredTime: new Date(0),
            },
          ]
        : [],
    });
  } finally {
    key.clear();
  }
};

describe('Dust snapshot mode changes with the installed SDK serializer', () => {
  it.each(['events', 'projections'] as const)(
    'the SDK projection composition restores a %s snapshot',
    async syncKind => {
      const saved = snapshot(false, syncKind);
      const wallet = createDustWallet(configuration, approved, false).restore(
        saved,
      );
      try {
        expect(await wallet.serializeState()).toBe(saved);
      } finally {
        await wallet.stop();
      }
    },
  );
  it('resumes an event snapshot without rebuilding', () => {
    expect(
      resolveDustRestoreMode(snapshot(false, 'events'), {
        network,
      }),
    ).toBe('restore');
  });
  it('resumes projections only with both consent and the rollout flag', () => {
    expect(
      resolveDustRestoreMode(snapshot(true), {
        network: approved,
      }),
    ).toBe('restore');
  });
  it.each([
    network,
    { ...approved, filteredDustSyncIndexer: undefined },
    { ...approved, isFilteredDustSyncRolloutEnabled: false },
    { ...approved, indexerAddress: 'http://different.example' },
  ])(
    'retains completed projections when filtering becomes unavailable: %j',
    async config => {
      const saved = snapshot();
      expect(() => resolveDustRestoreMode(saved, { network: config })).toThrow(
        'Saved wallet data has been retained',
      );
      expect(resolveDustRestoreMode(saved, { network: approved })).toBe(
        'restore',
      );
      const wallet = createDustWallet(configuration, approved, false).restore(
        saved,
      );
      try {
        expect(await wallet.serializeState()).toBe(saved);
      } finally {
        await wallet.stop();
      }
    },
  );
  it('rebuilds settled projections only after explicitly disabling filtering', () => {
    expect(
      resolveDustRestoreMode(snapshot(), {
        network: explicitDisable,
      }),
    ).toBe('rebuild');
  });
  it('does not use stale reset consent while filtering is still selected', () => {
    expect(() =>
      resolveDustRestoreMode(snapshot(), {
        network: {
          ...approved,
          isFilteredDustSyncRolloutEnabled: false,
          dustSyncResetAuthorizations: {},
        },
      }),
    ).toThrow('Saved wallet data has been retained');
  });
  it('refuses rollback with a pending spend without changing the snapshot', () => {
    const saved = snapshot(true);
    expect(() =>
      resolveDustRestoreMode(saved, {
        network: explicitDisable,
      }),
    ).toThrow('Dust spends are pending');
    const restored =
      Serialization.makeDefaultV2SerializationCapability().deserialize(
        null,
        saved,
      );
    expect(restored._tag).toBe('Right');
    if (restored._tag === 'Right')
      expect(restored.right.pendingDust).toHaveLength(1);
  });
  it('rebuilds a pending snapshot only with consent for its actual reservations', () => {
    const saved = snapshot(true);
    expect(getPendingDustNullifiersForReset(saved)).toEqual(['1']);
    expect(
      resolveDustRestoreMode(saved, {
        network: explicitDisable,
        authorizedPendingDustNullifiers: ['1'],
      }),
    ).toBe('rebuild');
    expect(() =>
      resolveDustRestoreMode(saved, {
        network: explicitDisable,
        authorizedPendingDustNullifiers: ['2'],
      }),
    ).toThrow('Dust spends are pending');
    expect(getPendingDustNullifiersForReset(saved)).toEqual(['1']);
  });
  it('does not request a reset for events, and rejects unreadable inspection data', () => {
    expect(getPendingDustNullifiersForReset(snapshot(true, 'events'))).toEqual(
      [],
    );
    expect(() => getPendingDustNullifiersForReset('invalid')).toThrow();
    expect(() => getPendingDustNullifiersForReset('null')).toThrow();
    expect(() =>
      getPendingDustNullifiersForReset('{"syncKind":"projections"}'),
    ).toThrow();
  });
  it('rejects unreadable projection inspection without turning it into reset consent', () => {
    const bad = '{"syncKind":"projections"}';
    expect(() => getPendingDustNullifiersForReset(bad)).toThrow();
    expect(() =>
      resolveDustRestoreMode(bad, {
        network: explicitDisable,
      }),
    ).toThrow();
    expect(() => resolveDustRestoreMode(bad, { network })).toThrow(
      'Saved wallet data has been retained',
    );
    expect(resolveDustRestoreMode(bad, { network: approved })).toBe('restore');
  });
  it('leaves ordinary unreadable caches to the existing recovery path', () => {
    expect(resolveDustRestoreMode('invalid', { network })).toBe('restore');
  });
});
