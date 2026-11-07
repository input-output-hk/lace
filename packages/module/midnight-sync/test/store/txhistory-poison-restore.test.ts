import {
  InMemoryTransactionHistoryStorage,
  mergeWalletEntries,
  WalletEntrySchema,
} from '@midnightntwrk/wallet-sdk';
import { DustWallet } from '@midnightntwrk/wallet-sdk/dust';
import { WalletFacade } from '@midnightntwrk/wallet-sdk/facade';
import { ShieldedWallet } from '@midnightntwrk/wallet-sdk/shielded';
import { UnshieldedWallet } from '@midnightntwrk/wallet-sdk/unshielded';
import { NetworkId } from '@midnightntwrk/wallet-sdk-abstractions';
import { describe, expect, it } from 'vitest';

import { PREPROD_POISON_TX_HISTORY } from '../fixtures/preprod-poison-txhistory';

// Characterization tests against the REAL SDK (not mocked): if a future SDK
// parses these blobs, or changes how it reports refusing to, revisit the
// discard-and-rebuild guard that depends on telling those cases apart.
describe('cross-version poison on restore (LW-15118)', () => {
  it('reports a tx-history blob written by 2.0.6 as a typed restore error with its schema cause', () => {
    // Named, and its message carries the expected shape — enough to classify on.
    const restore = () =>
      InMemoryTransactionHistoryStorage.restore(
        PREPROD_POISON_TX_HISTORY,
        WalletEntrySchema,
        mergeWalletEntries,
      );

    expect(restore).toThrow(
      expect.objectContaining({
        _tag: '@midnightntwrk/wallet-sdk-abstractions/TransactionHistoryFormat/TransactionHistoryRestoreError',
        cause: expect.objectContaining({ name: 'ParseError' }) as unknown,
      }) as Error,
    );
    expect(restore).toThrow(/readonly hash: string/);
  });

  describe('malformed wallet snapshots', () => {
    const configuration = WalletFacade.resolveConfiguration({
      costParameters: { feeBlocksMargin: 5 },
      networkId: NetworkId.NetworkId.PreProd,
      batchUpdates: { size: 12, spacing: 4 },
      indexerClientConnection: {
        indexerHttpUrl: 'http://localhost:9999',
        indexerWsUrl: 'ws://localhost:9999',
        keepAlive: 15_000,
      },
      provingServerUrl: new URL('http://localhost:9998'),
      relayURL: new URL('ws://localhost:9997'),
      txHistoryStorage: new InMemoryTransactionHistoryStorage(
        WalletEntrySchema,
        mergeWalletEntries,
      ),
    });

    it.each([
      ['shielded', () => ShieldedWallet(configuration).restore('poison')],
      ['unshielded', () => UnshieldedWallet(configuration).restore('poison')],
      ['dust', () => DustWallet(configuration).restore('poison')],
    ])('%s refuses a malformed local snapshot', (_, restore) => {
      expect(restore).toThrow(
        expect.objectContaining({
          _tag: '@midnightntwrk/wallet-sdk-abstractions/SnapshotFormat/SnapshotRestoreError',
        }),
      );
    });
  });
});
