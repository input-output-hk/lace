import { readFileSync } from 'node:fs';

import { SerialisedWalletState } from '@lace-contract/midnight-context';
import {
  InMemoryTransactionHistoryStorage,
  mergeWalletEntries,
  WalletEntrySchema,
} from '@midnightntwrk/wallet-sdk';
import { DustWallet } from '@midnightntwrk/wallet-sdk/dust';
import { WalletFacade } from '@midnightntwrk/wallet-sdk/facade';
import { ShieldedWallet } from '@midnightntwrk/wallet-sdk/shielded';
import { UnshieldedWallet } from '@midnightntwrk/wallet-sdk/unshielded';
import { describe, expect, it } from 'vitest';

const fixture = JSON.parse(
  readFileSync(
    new URL('../fixtures/sdk-1.2-wallet.json', import.meta.url),
    'utf8',
  ),
) as {
  provenance: { sdk: string };
  serializedState: {
    dust: string;
    shielded: string;
    unshielded: string;
    txHistory: string;
  };
};
const configuration = WalletFacade.resolveConfiguration({
  networkId: 'undeployed',
  relayURL: new URL('ws://node.invalid'),
  costParameters: { feeBlocksMargin: 5 },
  txHistoryStorage: new InMemoryTransactionHistoryStorage(
    WalletEntrySchema,
    mergeWalletEntries,
  ),
  indexerClientConnection: { indexerHttpUrl: 'http://indexer.invalid' },
});

describe('SDK 1.2 to 2.0 release upgrade', () => {
  it.each([
    ['dust', DustWallet(configuration)],
    ['shielded', ShieldedWallet(configuration)],
    ['unshielded', UnshieldedWallet(configuration)],
  ] as const)(
    'restores the SDK 1.2 %s snapshot and survives another restart',
    async (kind, Wallet) => {
      expect(fixture.provenance.sdk).toBe('1.2.0');
      const serialized = fixture.serializedState[kind];
      const original: unknown = JSON.parse(serialized);
      expect(original).not.toHaveProperty('version');
      const wallet = Wallet.restore(
        SerialisedWalletState.toJSON(SerialisedWalletState(serialized)),
      );
      try {
        const saved: unknown = JSON.parse(await wallet.serializeState());
        expect(saved).toMatchObject(original as Record<string, unknown>);
        if (kind === 'dust') {
          expect(saved).toMatchObject({
            version: 'v2',
            syncKind: 'events',
            pendingDust: [],
          });
        }
        const restarted = Wallet.restore(JSON.stringify(saved));
        try {
          expect(JSON.parse(await restarted.serializeState())).toEqual(saved);
        } finally {
          await restarted.stop();
        }
      } finally {
        await wallet.stop();
      }
    },
  );

  it('retains SDK 1.2 transaction history when rewriting and restoring it', async () => {
    const history = InMemoryTransactionHistoryStorage.restore(
      fixture.serializedState.txHistory,
      WalletEntrySchema,
      mergeWalletEntries,
    );
    const expected = [
      {
        hash: 'cd'.repeat(32),
        protocolVersion: 0,
        status: 'SUCCESS',
        lifecycle: { status: 'finalized' },
        identifiers: ['ef'.repeat(32)],
        timestamp: new Date('2026-11-01T00:00:00Z'),
        fees: 123n,
      },
    ];
    expect(await history.getAll()).toEqual(expected);
    const restarted = InMemoryTransactionHistoryStorage.restore(
      await history.serialize(),
      WalletEntrySchema,
      mergeWalletEntries,
    );
    expect(await restarted.getAll()).toEqual(expected);
  });
});
