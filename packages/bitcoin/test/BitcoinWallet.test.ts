/* eslint-disable no-magic-numbers, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import {
  AddressType,
  ChainType,
  BitcoinWalletInfo,
  Network,
  BitcoinWallet,
  TransactionHistoryEntry,
  UTxO
} from '../src/wallet/lib';
import { firstValueFrom, of } from 'rxjs';
import * as utils from '../src/wallet/lib/tx-builder/utils';
import { FeeMarketProvider } from '../src/wallet/lib/wallet/FeeMarketProvider';

jest.mock('../src/wallet/lib/tx-builder/utils');

describe('BitcoinWallet', () => {
  let provider: any;
  let logger: any;
  let walletInfo: BitcoinWalletInfo;
  let feeMarketProvider: FeeMarketProvider;

  beforeEach(() => {
    provider = {
      getLastKnownBlock: jest.fn(),
      getTransactions: jest.fn(),
      getTransactionsInMempool: jest.fn(),
      getUTxOs: jest.fn(),
      submitTransaction: jest.fn().mockResolvedValue('mockTxId'),
      estimateFee: jest.fn()
    };

    feeMarketProvider = {
      getFeeMarket: jest.fn().mockResolvedValue({
        fast: {
          feeRate: 0.000_025,
          targetConfirmationTime: 1
        },
        standard: {
          feeRate: 0.000_015,
          targetConfirmationTime: 3
        },
        slow: {
          feeRate: 0.000_01,
          targetConfirmationTime: 6
        }
      })
    };
    logger = {
      error: jest.fn(),
      debug: jest.fn()
    };

    walletInfo = {
      walletName: 'Bitcoin Wallet 1',
      accountIndex: 0,
      encryptedSecrets: {
        mnemonics:
          '0781acc923d79abd86dce53b85dcb5c5458153a7f1796e12a28c7153609ee9c8880e81db5ebf0f5d17ec5065700f9eaaee03f010d2c21ddea2c5d1fb6170dd10fcb37389bee6ab7155529a3d92ed687e2fcce2c708bc17cfa194a5577281d99da74d2f373a0fdd87f093bb0aa1e898404914d90e3e4e2d59047d1c041dd9a07193ad7181b07db942e9608d89807a8ada17a3b5cefd77417fa88f7858c56313bcb965531e057b4f4cb8553d24b20235813bfdd288088de7e9a4b77466e93c474422089ff68bea1396fa5b80041c4ce95e5e48448f054765f3d7170848',
        seed: 'abc7e239734866dc0df1c90120a9bdae5bcf81cdf3f74eb0e854ceeebedfb19d8650e680139c8c6c574bbb7b57b179e4dd0044dd8a0c718f0abf1e5067386f27e6f1c301dde6816038c6c8f3c70a91b12869f21c3502a1500589a9cc1b6593dfcbd22f89d31a2bc68948c7a4c89bd568a0d1c80992d597726c746b6e'
      },
      extendedAccountPublicKeys: {
        mainnet: {
          legacy:
            'xpub6CXqm3qd33LhU2AMmUnKjsgZuBZQfNPZ6ww3tbVpBNYZjbcPLTU43beBUvmMpMGsLQ2SKisS38FgQdKS5WtVy8fa46GokjgBVeUkwVzApTR',
          segWit:
            'xpub6DWj4HZsHB273iZThWdcBwvCxvDRWQkwSi3SjPQje5RvVbrKc61GoqVaHtkN2ha3sJCHEaFXSjsFNFgTfDMrFmHD848QRUtL9ZcRYtymKN6',
          nativeSegWit:
            'xpub6DQVZkr4QyJR5RiBtTqSZg2WTHxo9D1jcexG4WjFCwQfwy9XUQ7vM8QFeXeBcGUuCXeBsPCZ525WGuhm6dE6tcyU9aUiGm9EotXYvfTwBqt',
          taproot:
            'xpub6DSS1V32GwHMqZihBK9JaZgd6xnVugkEkPaSkbZgAYbzZC41nbUqcuH2N3tgeFMWudvJuYfX8kqWsKUd4oj3H3cUR6mPySGPL3PV6yzu7ko',
          electrumNativeSegWit:
            'xpub6D3Tc2KGUuhyTv5EdgR5eUmgG4Ai7DzYrsRCimRC9vYZLXcuKsFVkWySGPrsdqUsvpLDyiXeRJ9kKzTZVrtTWm8BUc539mQ2VGEnQwkiKox'
        },
        testnet: {
          legacy:
            'xpub6CLkFqDprtawP8VB21Hzgy5jhwgg7FhDDfJeeNn8Afv5supgd2V38x3E3R5om1ZN7avQiL6gcpYAQX71391WvmfymybGeyxEnHzEWBFQMrY',
          segWit:
            'xpub6C99JbTvGxYtBXEHUG7HMe8hJq9GFFRaAw5JsHprckQGmQCbqzDbRiznL3Shc8fsAxAa1GVhKdFYL4pFsgKh5hhS9Ddg5Ni6NSUgMzFprqF',
          nativeSegWit:
            'xpub6CrzGDoCVV56RUEdoKWVVXCA5JUJr9PQMQvXaUiGKjfBzZgwkJtKtHfvz3rCDnVL4qriaeZixHARX5MifcSDzZMnwBGVng5AqLZrsE1sUg1',
          taproot:
            'xpub6CZnCLkMMgC8aDH1yMeQeZnLGk7qeRxSG8pwHQvb2dkbXAuRopV57RoZLBUqBWMmiqxCaDDwpVWFCfLLAAJkWW4NCy4CKB4U2UUx95hnTYN',
          electrumNativeSegWit:
            'xpub6Bju9NoEG4m4x95tv1uX5fu7cCKf3ormkGbV3qtsvnwRqUmqcmCrej8RGQGmxWJRN23gfpZstUZ1uMnxUgkHju5udzPXqrJqDsq719UwXHj'
        }
      }
    };
  });

  it('initializes and exposes derived address', async () => {
    const poll$ = of(false); // disables polling for this test
    const wallet = new BitcoinWallet(
      provider,
      feeMarketProvider,
      30_000,
      20,
      walletInfo,
      Network.Testnet,
      poll$,
      logger
    );
    const addr = await wallet.getAddress();

    expect(addr.network).toBe(Network.Testnet);
    expect(addr.account).toBe(0);
    expect(addr.chain).toBe(ChainType.External);
    expect(addr.addressType).toBe(AddressType.NativeSegWit);
    expect(typeof addr.address).toBe('string');
    expect(addr.publicKeyHex).toMatch(/^[\da-f]+$/i);
  });

  it('submits a transaction and adds it to pendingTransactions$', async () => {
    const fakeEntry = {
      transactionHash: 'mockTxId',
      inputs: [],
      outputs: [],
      confirmations: 0,
      blockHeight: 0,
      timestamp: 0,
      status: 'pending'
    };

    (utils.historyEntryFromRawTx as jest.Mock).mockResolvedValue(fakeEntry);

    const poll$ = of(false);
    const wallet = new BitcoinWallet(
      provider,
      feeMarketProvider,
      30_000,
      20,
      walletInfo,
      Network.Testnet,
      poll$,
      logger
    );

    const txId = await wallet.submitTransaction('rawTxHex');

    expect(txId).toBe('mockTxId');
    expect(provider.submitTransaction).toHaveBeenCalledWith('rawTxHex');
    expect(utils.historyEntryFromRawTx).toHaveBeenCalledWith('rawTxHex', Network.Testnet, expect.anything());

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
      status: 'pending'
    } as unknown as TransactionHistoryEntry;

    (utils.historyEntryFromRawTx as jest.Mock).mockResolvedValue(fakeEntry);

    const poll$ = of(false);
    const wallet = new BitcoinWallet(
      provider,
      feeMarketProvider,
      30_000,
      20,
      walletInfo,
      Network.Testnet,
      poll$,
      logger
    );

    wallet.pendingTransactions$.next([fakeEntry]);

    const txId = await wallet.submitTransaction('rawTxHex');
    const pending = wallet.pendingTransactions$.getValue();

    expect(pending.length).toBe(1);
    expect(pending[0].transactionHash).toBe(txId);

    wallet.shutdown();
  });

  it('syncs remote pending transactions and removes/replaces local ones correctly', async () => {
    const poll$ = of(false);
    const wallet = new BitcoinWallet(
      provider,
      feeMarketProvider,
      30_000,
      20,
      walletInfo,
      Network.Testnet,
      poll$,
      logger
    );

    // Manually set transactionHistory (simulate confirmed tx using input a:0)
    (wallet as any).transactionHistory = [
      {
        transactionHash: 'confirmed-tx',
        inputs: [{ txId: 'a', index: 0 }],
        outputs: [],
        confirmations: 6
      } as unknown as TransactionHistoryEntry
    ];

    (wallet as any).pe = [
      {
        transactionHash: 'confirmed-tx',
        inputs: [{ txId: 'a', index: 0 }],
        outputs: [],
        confirmations: 6
      } as unknown as TransactionHistoryEntry
    ];

    // Remote mempool txs (includes one that replaces localTx2)
    provider.getTransactionsInMempool.mockResolvedValue([
      {
        transactionHash: 'remoteTx1',
        inputs: [{ txId: 'x', index: 1 }],
        outputs: [],
        confirmations: 0
      },
      {
        transactionHash: 'rbf-tx', // replaces localTx2
        inputs: [{ txId: 'b', index: 1 }],
        outputs: [],
        confirmations: 0
      }
    ]);

    wallet.pendingTransactions$.next([
      {
        transactionHash: 'localTx1',
        inputs: [{ txId: 'a', index: 0 }], // should be removed (input now confirmed)
        outputs: [],
        confirmations: 0
      } as unknown as TransactionHistoryEntry,
      {
        transactionHash: 'localTx2',
        inputs: [{ txId: 'b', index: 1 }], // should be replaced (RBF)
        outputs: [],
        confirmations: 0
      } as unknown as TransactionHistoryEntry
    ]);

    await (wallet as any).updatePendingTransactions();

    const updated = wallet.pendingTransactions$.getValue();
    const hashes = updated.map((tx) => tx.transactionHash);

    expect(hashes).toContain('remoteTx1'); // new
    expect(hashes).toContain('rbf-tx'); // replacement
    expect(hashes).not.toContain('localTx1'); // removed (confirmed input)
    expect(hashes).not.toContain('localTx2'); // replaced (RBF)
    expect(updated.length).toBe(2);

    wallet.shutdown();
  });

  it('returns static fee market on testnet', async () => {
    const poll$ = of(false);
    const wallet = new BitcoinWallet(
      provider,
      feeMarketProvider,
      30_000,
      20,
      walletInfo,
      Network.Testnet,
      poll$,
      logger
    );

    const fees = await wallet.getCurrentFeeMarket();
    expect(fees.fast.feeRate).toBe(0.000_025);
    expect(fees.standard.feeRate).toBe(0.000_015);
    expect(fees.slow.feeRate).toBe(0.000_01);

    wallet.shutdown();
  });

  it('populates utxos$ when new UTXOs are received', async () => {
    const utxos: UTxO[] = [{ txId: 'abc', index: 0, address: 'addr1', satoshis: BigInt(1000) }];

    provider.getUTxOs.mockResolvedValue(utxos);

    const poll$ = of(false);
    const wallet = new BitcoinWallet(
      provider,
      feeMarketProvider,
      30_000,
      20,
      walletInfo,
      Network.Testnet,
      poll$,
      logger
    );

    expect(wallet.utxos$.value).toEqual([]);

    await (wallet as any).updateUtxos();

    expect(wallet.utxos$.value).toEqual(utxos);

    wallet.shutdown();
  });

  it('updates utxos$ and balance$ when the UTXO set changes', async () => {
    const oldUtxos: UTxO[] = [{ txId: 'abc', index: 0, address: 'addr1', satoshis: BigInt(1000) }];

    const newUtxos: UTxO[] = [
      { txId: 'def', index: 1, address: 'addr2', satoshis: BigInt(2000) },
      { txId: 'ghi', index: 2, address: 'addr3', satoshis: BigInt(3000) }
    ];

    provider.getUTxOs.mockResolvedValue(newUtxos);

    const poll$ = of(false);
    const wallet = new BitcoinWallet(
      provider,
      feeMarketProvider,
      30_000,
      20,
      walletInfo,
      Network.Testnet,
      poll$,
      logger
    );

    wallet.utxos$.next(oldUtxos);
    wallet.balance$.next(BigInt(1000));

    await (wallet as any).updateUtxos();

    expect(wallet.utxos$.value).toEqual(newUtxos);
    expect(wallet.balance$.value).toEqual(BigInt(5000));

    wallet.shutdown();
  });

  it('updates transaction history when new transactions are detected', async () => {
    const poll$ = of(false);
    const wallet = new BitcoinWallet(
      provider,
      feeMarketProvider,
      30_000,
      20,
      walletInfo,
      Network.Testnet,
      poll$,
      logger
    );

    const newTxs: TransactionHistoryEntry[] = [
      {
        transactionHash: 'tx1',
        inputs: [],
        outputs: [],
        confirmations: 1,
        blockHeight: 100,
        timestamp: 12_345_678
      } as unknown as TransactionHistoryEntry
    ];

    provider.getTransactions.mockResolvedValue({ transactions: newTxs });

    const changed = await (wallet as any).updateTransactions();

    expect(changed).toBe(true);
    expect((wallet as any).transactionHistory).toEqual(newTxs);

    const emitted = await firstValueFrom(wallet.transactionHistory$);
    expect(emitted).toEqual(newTxs);

    wallet.shutdown();
  });

  it('does not update transaction history when there are no changes', async () => {
    const poll$ = of(false);
    const wallet = new BitcoinWallet(
      provider,
      feeMarketProvider,
      30_000,
      20,
      walletInfo,
      Network.Testnet,
      poll$,
      logger
    );

    const existingTxs: TransactionHistoryEntry[] = [
      {
        transactionHash: 'tx1',
        inputs: [],
        outputs: [],
        confirmations: 1,
        blockHeight: 100,
        timestamp: 12_345_678
      } as unknown as TransactionHistoryEntry
    ];

    (wallet as any).transactionHistory = existingTxs;
    wallet.transactionHistory$.next(existingTxs);

    provider.getTransactions.mockResolvedValue({ transactions: [...existingTxs] });

    const changed = await (wallet as any).updateTransactions();

    expect(changed).toBe(false);
    expect((wallet as any).transactionHistory).toEqual(existingTxs);

    const emitted = await firstValueFrom(wallet.transactionHistory$);
    expect(emitted).toEqual(existingTxs);

    wallet.shutdown();
  });
});
