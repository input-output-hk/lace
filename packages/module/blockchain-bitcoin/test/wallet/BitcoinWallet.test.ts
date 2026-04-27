/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */
import { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import { WalletId } from '@lace-contract/wallet-repo';
import { Ok } from '@lace-sdk/util';
import { EMPTY, firstValueFrom, of } from 'rxjs';
import { it, describe, expect, beforeEach, vi } from 'vitest';

import { AddressType, ChainType } from '../../src/common';
import * as utils from '../../src/tx-builder/utils';
import { BitcoinWallet } from '../../src/wallet';

import type { BitcoinWalletInfo } from '../../src/common';
import type {
  BitcoinFeeMarketProvider,
  BitcoinTransactionHistoryEntry,
  BitcoinUTxO,
  BitcoinBlockInfo,
} from '@lace-contract/bitcoin-context';
import type { Observable } from 'rxjs';
import type { Mock } from 'vitest';

vi.mock('../../src/tx-builder/utils');

describe('BitcoinWallet', () => {
  let provider: any;
  let logger: any;
  let walletInfo: BitcoinWalletInfo;
  let feeMarketProvider: BitcoinFeeMarketProvider;
  let poll$: Observable<BitcoinBlockInfo>;
  let resync$: Observable<unknown>;

  beforeEach(() => {
    provider = {
      getLastKnownBlock: vi.fn(),
      getTransactions: vi.fn(),
      getTransaction: vi.fn(),
      getTransactionStatus: vi.fn(),
      getTransactionsInMempool: vi.fn(),
      getUTxOs: vi.fn(),
      submitTransaction: vi.fn().mockImplementation(() => of(Ok('mockTxId'))),
      estimateFee: vi.fn(),
    };

    feeMarketProvider = {
      getFeeMarket: vi.fn().mockImplementationOnce(() =>
        of(
          Ok({
            fast: {
              feeRate: 0.000_025,
              targetConfirmationTime: 1,
            },
            standard: {
              feeRate: 0.000_015,
              targetConfirmationTime: 3,
            },
            slow: {
              feeRate: 0.000_01,
              targetConfirmationTime: 6,
            },
          }),
        ),
      ),
    };

    logger = {
      error: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      trace: vi.fn(),
    };

    walletInfo = {
      accountIndex: 0,
      network: BitcoinNetwork.Testnet,
      walletId: WalletId('test-wallet-id'),
      extendedAccountPublicKeys: {
        legacy:
          'xpub6CLkFqDprtawP8VB21Hzgy5jhwgg7FhDDfJeeNn8Afv5supgd2V38x3E3R5om1ZN7avQiL6gcpYAQX71391WvmfymybGeyxEnHzEWBFQMrY',
        segWit:
          'xpub6C99JbTvGxYtBXEHUG7HMe8hJq9GFFRaAw5JsHprckQGmQCbqzDbRiznL3Shc8fsAxAa1GVhKdFYL4pFsgKh5hhS9Ddg5Ni6NSUgMzFprqF',
        nativeSegWit:
          'xpub6CrzGDoCVV56RUEdoKWVVXCA5JUJr9PQMQvXaUiGKjfBzZgwkJtKtHfvz3rCDnVL4qriaeZixHARX5MifcSDzZMnwBGVng5AqLZrsE1sUg1',
        taproot:
          'xpub6CZnCLkMMgC8aDH1yMeQeZnLGk7qeRxSG8pwHQvb2dkbXAuRopV57RoZLBUqBWMmiqxCaDDwpVWFCfLLAAJkWW4NCy4CKB4U2UUx95hnTYN',
        electrumNativeSegWit:
          'xpub6Bju9NoEG4m4x95tv1uX5fu7cCKf3ormkGbV3qtsvnwRqUmqcmCrej8RGQGmxWJRN23gfpZstUZ1uMnxUgkHju5udzPXqrJqDsq719UwXHj',
      },
    };

    poll$ = EMPTY as Observable<BitcoinBlockInfo>;
    resync$ = EMPTY as Observable<unknown>;
  });

  it('initializes and exposes derived address', async () => {
    const wallet = new BitcoinWallet(
      provider,
      feeMarketProvider,
      20, // historyDepth
      walletInfo,
      poll$,
      resync$,
      logger,
    );

    const addr = await firstValueFrom(wallet.getAddress());

    expect(addr.unwrap().network).toBe(BitcoinNetwork.Testnet);
    expect(addr.unwrap().account).toBe(0);
    expect(addr.unwrap().chain).toBe(ChainType.External);
    expect(addr.unwrap().addressType).toBe(AddressType.NativeSegWit);
    expect(typeof addr.unwrap().address).toBe('string');
    expect(addr.unwrap().publicKeyHex).toMatch(/^[\da-f]+$/i);

    wallet.shutdown();
  });

  it('submits a transaction and adds it to pendingTransactions$', async () => {
    const fakeEntry = {
      transactionHash: 'mockTxId',
      inputs: [],
      outputs: [],
      confirmations: 0,
      blockHeight: 0,
      timestamp: 0,
      status: 'pending',
    };

    (utils.historyEntryFromRawTx as Mock).mockResolvedValue(fakeEntry);

    const wallet = new BitcoinWallet(
      provider,
      feeMarketProvider,
      20,
      walletInfo,
      poll$,
      resync$,
      logger,
    );

    const txId = await firstValueFrom(wallet.submitTransaction('rawTxHex'));

    expect(txId.unwrap()).toBe('mockTxId');
    expect(provider.submitTransaction).toHaveBeenCalledWith(
      {
        network: 'testnet4',
      },
      'rawTxHex',
    );
    expect(utils.historyEntryFromRawTx).toHaveBeenCalledWith(
      'rawTxHex',
      BitcoinNetwork.Testnet,
      expect.anything(),
    );

    const pending = wallet.pendingTransactions$.getValue();
    expect(pending.length).toBe(1);
    expect(pending[0].transactionHash).toBe('mockTxId');
    expect(pending[0].status).toBe('pending');

    wallet.shutdown();
  });

  it('does not add a duplicate transaction to pendingTransactions$', async () => {
    const fakeEntry = {
      transactionHash: 'mockTxId',
      inputs: [],
      outputs: [],
      confirmations: 0,
      blockHeight: 0,
      timestamp: 0,
      status: 'pending',
    } as unknown as BitcoinTransactionHistoryEntry;

    (utils.historyEntryFromRawTx as Mock).mockResolvedValue(fakeEntry);

    const wallet = new BitcoinWallet(
      provider,
      feeMarketProvider,
      20,
      walletInfo,
      poll$,
      resync$,
      logger,
    );

    wallet.pendingTransactions$.next([fakeEntry]);

    const txId = await firstValueFrom(wallet.submitTransaction('rawTxHex'));
    const pending = wallet.pendingTransactions$.getValue();

    expect(pending.length).toBe(1);
    expect(pending[0].transactionHash).toBe(txId.unwrap());

    wallet.shutdown();
  });

  it('syncs remote pending transactions and removes/replaces local ones correctly', async () => {
    const wallet = new BitcoinWallet(
      provider,
      feeMarketProvider,
      20,
      walletInfo,
      poll$,
      resync$,
      logger,
    );

    wallet.transactionHistory$.next([
      {
        transactionHash: 'confirmed-tx',
        inputs: [{ txId: 'a', index: 0 }],
        outputs: [],
        confirmations: 6,
      } as unknown as BitcoinTransactionHistoryEntry,
    ]);

    provider.getTransactionsInMempool.mockImplementation(() =>
      of(
        Ok({
          items: [
            {
              transactionHash: 'remoteTx1',
              inputs: [{ txId: 'x', index: 1 }],
              outputs: [],
              confirmations: 0,
            },
            {
              transactionHash: 'rbf-tx',
              inputs: [{ txId: 'b', index: 1 }],
              outputs: [],
              confirmations: 0,
            },
          ],
          cursor: '',
        }),
      ),
    );

    wallet.pendingTransactions$.next([
      {
        transactionHash: 'localTx1',
        inputs: [{ txId: 'a', index: 0 }],
        outputs: [],
        confirmations: 0,
      } as unknown as BitcoinTransactionHistoryEntry,
      {
        transactionHash: 'localTx2',
        inputs: [{ txId: 'b', index: 1 }],
        outputs: [],
        confirmations: 0,
      } as unknown as BitcoinTransactionHistoryEntry,
    ]);

    await firstValueFrom((wallet as any).updatePendingTransactions());

    const updated = wallet.pendingTransactions$.getValue();
    const hashes = updated.map(tx => tx.transactionHash);

    expect(hashes).toContain('remoteTx1'); // new
    expect(hashes).toContain('rbf-tx'); // replacement
    expect(hashes).not.toContain('localTx1'); // removed (confirmed input)
    expect(hashes).not.toContain('localTx2'); // replaced (RBF)
    expect(updated.length).toBe(2);

    wallet.shutdown();
  });

  it('removes pending transactions that are already in confirmed history', async () => {
    const wallet = new BitcoinWallet(
      provider,
      feeMarketProvider,
      20,
      walletInfo,
      poll$,
      resync$,
      logger,
    );

    const confirmedTx: BitcoinTransactionHistoryEntry = {
      transactionHash: 'already-confirmed',
      inputs: [],
      outputs: [],
      confirmations: 3,
      blockHeight: 100,
      timestamp: 1_700_000_000,
    } as unknown as BitcoinTransactionHistoryEntry;

    wallet.transactionHistory$.next([confirmedTx]);

    provider.getTransactionsInMempool.mockImplementation(() =>
      of(
        Ok({
          items: [
            {
              transactionHash: 'already-confirmed', // should be filtered out
              inputs: [],
              outputs: [],
              confirmations: 0,
            },
            {
              transactionHash: 'still-pending',
              inputs: [],
              outputs: [],
              confirmations: 0,
            },
          ],
          cursor: '',
        }),
      ),
    );

    wallet.pendingTransactions$.next([
      {
        transactionHash: 'already-confirmed',
        inputs: [],
        outputs: [],
        confirmations: 0,
      } as unknown as BitcoinTransactionHistoryEntry,
      {
        transactionHash: 'still-pending',
        inputs: [],
        outputs: [],
        confirmations: 0,
      } as unknown as BitcoinTransactionHistoryEntry,
    ]);

    await firstValueFrom((wallet as any).updatePendingTransactions());

    const updated = wallet.pendingTransactions$.getValue();
    const hashes = updated.map(tx => tx.transactionHash);

    expect(hashes).not.toContain('already-confirmed');
    expect(hashes).toContain('still-pending');
    expect(updated.length).toBe(1);

    wallet.shutdown();
  });

  it('returns static fee market on testnet', async () => {
    const wallet = new BitcoinWallet(
      provider,
      feeMarketProvider,
      20,
      walletInfo,
      poll$,
      resync$,
      logger,
    );

    const fees = await firstValueFrom(wallet.getCurrentFeeMarket());
    expect(fees.unwrap().fast.feeRate).toBe(0.000_025);
    expect(fees.unwrap().standard.feeRate).toBe(0.000_015);
    expect(fees.unwrap().slow.feeRate).toBe(0.000_01);

    wallet.shutdown();
  });

  it('populates utxos$ when new UTXOs are received', async () => {
    const utxos: BitcoinUTxO[] = [
      {
        txId: 'abc',
        index: 0,
        address: 'addr1',
        satoshis: 1000,
      } as unknown as BitcoinUTxO,
    ];

    provider.getUTxOs.mockImplementation(() =>
      of(Ok({ items: utxos, cursor: '' })),
    );

    const wallet = new BitcoinWallet(
      provider,
      feeMarketProvider,
      20,
      walletInfo,
      poll$,
      resync$,
      logger,
    );

    expect(wallet.utxos$.value).toEqual([]);

    await firstValueFrom((wallet as any).updateUtxos());

    expect(wallet.utxos$.value).toEqual(utxos);

    wallet.shutdown();
  });

  it('updates utxos$ and balance$ when the UTXO set changes', async () => {
    const oldUtxos: BitcoinUTxO[] = [
      {
        txId: 'abc',
        index: 0,
        address: 'addr1',
        satoshis: 1000,
      } as unknown as BitcoinUTxO,
    ];

    const newUtxos: BitcoinUTxO[] = [
      {
        txId: 'def',
        index: 1,
        address: 'addr2',
        satoshis: 2000,
      } as unknown as BitcoinUTxO,
      {
        txId: 'ghi',
        index: 2,
        address: 'addr3',
        satoshis: 3000,
      } as unknown as BitcoinUTxO,
    ];

    provider.getUTxOs.mockImplementation(() =>
      of(Ok({ items: newUtxos, cursor: '' })),
    );

    const wallet = new BitcoinWallet(
      provider,
      feeMarketProvider,
      20,
      walletInfo,
      poll$,
      resync$,
      logger,
    );

    wallet.utxos$.next(oldUtxos);
    wallet.balance$.next(1000);

    await firstValueFrom((wallet as any).updateUtxos());

    expect(wallet.utxos$.value).toEqual(newUtxos);
    expect(wallet.balance$.value).toEqual(5000);

    wallet.shutdown();
  });

  it('updates transaction history when new transactions are detected', async () => {
    const wallet = new BitcoinWallet(
      provider,
      feeMarketProvider,
      20,
      walletInfo,
      poll$,
      resync$,
      logger,
    );

    const newTxs: BitcoinTransactionHistoryEntry[] = [
      {
        transactionHash: 'tx1',
        inputs: [],
        outputs: [],
        confirmations: 1,
        blockHeight: 100,
        timestamp: 12_345_678,
      } as unknown as BitcoinTransactionHistoryEntry,
    ];

    provider.getTransactions.mockImplementation(() =>
      of(Ok({ items: newTxs, cursor: '' })),
    );

    const changed = await firstValueFrom((wallet as any).updateTransactions());

    expect(changed).toBe(true);

    const emitted = await firstValueFrom(wallet.transactionHistory$);
    expect(emitted).toEqual(newTxs);

    wallet.shutdown();
  });

  it('does not update transaction history when there are no changes', async () => {
    const wallet = new BitcoinWallet(
      provider,
      feeMarketProvider,
      20,
      walletInfo,
      poll$,
      resync$,
      logger,
    );

    const existingTxs: BitcoinTransactionHistoryEntry[] = [
      {
        transactionHash: 'tx1',
        inputs: [],
        outputs: [],
        confirmations: 1,
        blockHeight: 100,
        timestamp: 12_345_678,
      } as unknown as BitcoinTransactionHistoryEntry,
    ];

    wallet.transactionHistory$.next(existingTxs);

    provider.getTransactions.mockImplementation(() =>
      of(Ok({ items: [...existingTxs], cursor: '' })),
    );

    const changed = await firstValueFrom((wallet as any).updateTransactions());

    expect(changed).toBe(false);

    const emitted = await firstValueFrom(wallet.transactionHistory$);
    expect(emitted).toEqual(existingTxs);

    wallet.shutdown();
  });
});
