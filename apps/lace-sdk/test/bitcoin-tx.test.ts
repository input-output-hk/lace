import {
  BITCOIN_FEATURE_FLAG,
  BITCOIN_MEMPOOL_FEE_MARKET_FEATURE_FLAG,
  BitcoinNetwork,
  BitcoinNetworkId,
} from '@lace-contract/bitcoin-context';
import { FEATURE_FLAG_NETWORK_TYPE } from '@lace-contract/network';
import { HexBytes, Milliseconds } from '@lace-lib/util';
import {
  bitcoinAccountWallets$,
  DUST_THRESHOLD,
} from '@lace-module/blockchain-bitcoin/sdk';
import { Transaction } from 'bitcoinjs-lib';
import { combineLatest, filter, firstValueFrom, map, timeout } from 'rxjs';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { createBitcoinLazyInMemoryVaultModule } from '../src/bitcoin/create-bitcoin-lazy-in-memory-vault-module';
import * as bitcoinEntry from '../src/bitcoin/index';
import { createInMemoryWalletEntity } from '../src/create-in-memory-wallet-entity';
import { createLaceWallet } from '../src/create-lace-wallet';
import { LazyWalletMismatchError } from '../src/lazy-wallet-mismatch-error';

import type { WithMnemonicWords } from '../src/cardano-lazy-in-memory-signer-factory';
import type { BitcoinProviderDependencies } from '@lace-contract/bitcoin-context';
import type * as BitcoinContext from '@lace-contract/bitcoin-context';
import type { FeatureFlag } from '@lace-contract/feature';
import type { AppConfig } from '@lace-contract/module';
import type { AccountId, AnyWallet } from '@lace-contract/wallet-repo';
import type * as BitcoinProviderCore from '@lace-lib/bitcoin-provider-core';
import type * as Util from '@lace-lib/util';

const chain = vi.hoisted(() => ({
  /** The BIP-84 test vector's testnet account 0, external address 0. */
  ownedAddress: 'tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl',
  fundingTxId:
    '1d9245e858a53a79c1fed40deb9666f782f688113b9a5b2bdc01dc016953ed34',
  submitted: [] as string[],
  submission: 'accept' as 'accept' | 'never' | 'reject',
}));

vi.mock('@lace-lib/bitcoin-provider-core', async importActual => {
  const actual = await importActual<typeof BitcoinProviderCore>();
  const { NEVER, of } = await import('rxjs');
  const { Err, Ok } = await vi.importActual<typeof Util>('@lace-lib/util');
  const { ProviderError, ProviderFailure } = await import('@cardano-sdk/core');
  const { Transaction } = await import('bitcoinjs-lib');
  const { BitcoinTransactionStatus } = await vi.importActual<
    typeof BitcoinContext
  >('@lace-contract/bitcoin-context');
  const fundingTx = {
    transactionHash: chain.fundingTxId,
    inputs: [],
    outputs: [{ address: chain.ownedAddress, satoshis: 10_000_000 }],
    confirmations: 10,
    status: BitcoinTransactionStatus.Confirmed,
    blockHeight: 100,
    timestamp: 1_700_000_000,
  };
  const provider: BitcoinProviderDependencies['bitcoinProvider'] = {
    getLastKnownBlock: () => of(Ok({ height: 110, hash: 'a'.repeat(64) })),
    getTransaction: () => of(Ok(fundingTx)),
    getRawTransaction: () =>
      of(Err(new ProviderError(ProviderFailure.NotImplemented))),
    getTransactions: () => of(Ok({ items: [fundingTx], cursor: '' })),
    getTransactionsInMempool: () => of(Ok({ items: [], cursor: '' })),
    getUTxOs: () =>
      of(
        Ok({
          items: [
            {
              txId: chain.fundingTxId,
              index: 0,
              satoshis: 10_000_000,
              address: chain.ownedAddress,
              script: '',
              confirmations: 10,
              height: 100,
              runes: [],
              inscriptions: [],
            },
          ],
          cursor: '',
        }),
      ),
    submitTransaction: (_context, rawTransaction) => {
      if (chain.submission === 'never') return NEVER;
      if (chain.submission === 'reject') {
        return of(
          Err(
            new ProviderError(
              ProviderFailure.BadRequest,
              null,
              'bad-txns-inputs-missingorspent',
            ),
          ),
        );
      }
      chain.submitted.push(rawTransaction);
      return of(Ok(Transaction.fromHex(rawTransaction).getId()));
    },
    getTransactionStatus: () => of(Ok(BitcoinTransactionStatus.Pending)),
    estimateFee: () =>
      of(Err(new ProviderError(ProviderFailure.NotImplemented))),
  };
  return { ...actual, createMaestroBitcoinProvider: () => provider };
});

const words =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'.split(
    ' ',
  );
const otherWords =
  'legal winner thank year wave sausage worth useful legal winner thank yellow'.split(
    ' ',
  );
/**
 * Encrypting or decrypting a seed with a password takes several seconds on CI
 * runners.
 */
const passwordTestTimeout = 30_000;

const password = new TextEncoder().encode('password');
/** The BIP-84 test vector's testnet account 0, external address 1. */
const recipientAddress = 'tb1qd7spv5q28348xl4myc8zmh983w5jx32cjhkn97';
const testnetId = BitcoinNetworkId(BitcoinNetwork.Testnet);

const featureFlags: FeatureFlag[] = [
  { key: BITCOIN_FEATURE_FLAG },
  { key: BITCOIN_MEMPOOL_FEE_MARKET_FEATURE_FLAG },
  { key: FEATURE_FLAG_NETWORK_TYPE, payload: 'testnet' },
];

const config: Partial<AppConfig> = {
  bitcoinProvider: {
    tipPollFrequency: Milliseconds(60_000),
    historyDepth: 20,
    maestroConfig: {
      [BitcoinNetwork.Testnet]: {
        clientConfig: {
          baseUrl: 'https://xbt-testnet.gomaestro-api.org',
          apiVersion: 'v0',
          projectId: 'bitcoin-tx-test',
        },
        rateLimiterConfig: {
          size: 500,
          increaseAmount: 10,
          increaseInterval: Milliseconds(1000),
        },
      },
    },
  },
  bitcoinFeeMarketProvider: {
    mempoolSpaceConfig: {
      [BitcoinNetwork.Testnet]: { url: 'https://mempool.space/testnet4' },
    },
  },
  defaultFeatureFlags: featureFlags,
  extraFeatureFlags: [],
};

const withWords =
  (mnemonic: readonly string[]): WithMnemonicWords =>
  async use =>
    use(mnemonic);

const createBitcoinWallet = async (
  withMnemonicWords: WithMnemonicWords = withWords(words),
) =>
  createLaceWallet({
    modules: [
      bitcoinEntry.m.featureDev,
      bitcoinEntry.m.storageInMemory,
      bitcoinEntry.m.blockchainBitcoin,
      bitcoinEntry.m.bitcoinProviderMaestro,
      bitcoinEntry.m.bitcoinMempoolFeeMarket,
      createBitcoinLazyInMemoryVaultModule({ withMnemonicWords }),
    ] as const,
    environment: 'development',
    featureFlags,
    config,
  });

type BitcoinTestWallet = Awaited<ReturnType<typeof createBitcoinWallet>>;

const testnetAccountId = (entity: AnyWallet): AccountId =>
  entity.accounts.find(account => account.blockchainNetworkId === testnetId)!
    .accountId;

/** Adds wallet entities to `wallet` and waits for their testnet accounts to sync. */
const addSyncedWallets = async (
  wallet: BitcoinTestWallet,
  ...entities: AnyWallet[]
) => {
  for (const entity of entities) {
    wallet.dispatch('wallets.addWallet', entity);
  }
  for (const entity of entities) {
    await bitcoinEntry.waitForBitcoinAccountSync(wallet, {
      accountId: testnetAccountId(entity),
      timeout: Milliseconds(5000),
    });
  }
};

/**
 * Adds wallet entities to `wallet` without waiting for their accounts to
 * sync, for wallets that only sign. Signing resolves the account against the
 * active network, so this waits until each entity's Bitcoin account is on it.
 */
const addWallets = async (
  wallet: BitcoinTestWallet,
  ...entities: AnyWallet[]
) => {
  for (const entity of entities) {
    wallet.dispatch('wallets.addWallet', entity);
  }
  await firstValueFrom(
    combineLatest([
      wallet.stateObservables.wallets.selectAll$,
      wallet.stateObservables.network.selectAllActiveNetworkIds$,
    ]).pipe(
      filter(
        ([all, activeNetworkIds]) =>
          all.length === entities.length &&
          entities.every(entity =>
            entity.accounts.some(
              account =>
                account.blockchainName === 'Bitcoin' &&
                activeNetworkIds.includes(account.blockchainNetworkId),
            ),
          ),
      ),
    ),
  );
};

const createLazyWallet = async (withMnemonicWords?: WithMnemonicWords) => {
  const wallet = await createBitcoinWallet(withMnemonicWords);
  const entity = await createInMemoryWalletEntity(wallet, {
    mnemonicWords: words,
    walletName: 'Lazy',
  });
  await addSyncedWallets(wallet, entity);
  return { wallet, accountId: testnetAccountId(entity) };
};

const buildUnsignedTx = async (wallet: BitcoinTestWallet) =>
  (
    await bitcoinEntry.buildBitcoinTx(wallet, {
      recipients: [{ address: recipientAddress, amount: 1000 }],
      feeRate: { feeOption: 'Custom', satsPerVByte: 2 },
    })
  ).unwrap().serializedTx;

/**
 * Every wallet in a JavaScript realm registers its Bitcoin accounts in one
 * shared registry, and every test loads the same account, so each test starts
 * from an empty registry to see only the wallets it creates.
 */
beforeEach(() => {
  bitcoinAccountWallets$.next({});
});

afterEach(() => {
  vi.useRealTimers();
});

describe('buildBitcoinTx', () => {
  it('builds a payment at a fee market tier', async () => {
    const { wallet } = await createLazyWallet();

    const result = await bitcoinEntry.buildBitcoinTx(wallet, {
      recipients: [{ address: recipientAddress, amount: 1000 }],
      feeRate: { feeOption: 'Average' },
    });

    const { serializedTx, fee } = result.unwrap();
    expect(serializedTx).toMatch(/^[\da-f]+$/);
    expect(fee).toBeGreaterThan(0n);
  });

  it('pays a higher fee at a higher custom rate', async () => {
    const { wallet, accountId } = await createLazyWallet();
    const buildAt = async (satsPerVByte: number) =>
      (
        await bitcoinEntry.buildBitcoinTx(wallet, {
          accountId,
          recipients: [{ address: recipientAddress, amount: 1000 }],
          feeRate: { feeOption: 'Custom', satsPerVByte },
          memo: 'rent',
        })
      ).unwrap().fee;

    const lowFee = await buildAt(1);
    const highFee = await buildAt(2);

    expect(lowFee).toBeGreaterThan(0n);
    expect(highFee).toBeGreaterThan(lowFee);
  });

  it.each([0, -1, Number.NaN, 10_001])(
    'fails for a custom rate of %s satoshis per virtual byte',
    async satsPerVByte => {
      const { wallet } = await createLazyWallet();

      const result = await bitcoinEntry.buildBitcoinTx(wallet, {
        recipients: [{ address: recipientAddress, amount: 1000 }],
        feeRate: { feeOption: 'Custom', satsPerVByte },
      });

      expect(result.isErr() && result.error.message).toContain(
        `Invalid fee rate ${satsPerVByte}`,
      );
    },
  );

  it('fails before the account wallet has started', async () => {
    const { wallet, accountId } = await createLazyWallet();
    bitcoinAccountWallets$.next({});

    const result = await bitcoinEntry.buildBitcoinTx(wallet, {
      recipients: [{ address: recipientAddress, amount: 1000 }],
      feeRate: { feeOption: 'Average' },
    });

    expect(result.isErr() && result.error.message).toBe(
      `Bitcoin account "${accountId}" has not started syncing yet`,
    );
  });

  it('fails for an unknown account', async () => {
    const { wallet } = await createLazyWallet();

    const result = await bitcoinEntry.buildBitcoinTx(wallet, {
      accountId: 'unknown' as AccountId,
      recipients: [{ address: recipientAddress, amount: 1000 }],
      feeRate: { feeOption: 'Average' },
    });

    expect(result.isErr() && result.error.message).toBe(
      'Bitcoin account "unknown" not found on the active network',
    );
  });

  it('fails without an account when several accounts match', async () => {
    const wallet = await createBitcoinWallet();
    await addSyncedWallets(
      wallet,
      await createInMemoryWalletEntity(wallet, {
        mnemonicWords: words,
        walletName: 'First',
      }),
      await createInMemoryWalletEntity(wallet, {
        mnemonicWords: otherWords,
        walletName: 'Second',
        order: 1,
      }),
    );

    const result = await bitcoinEntry.buildBitcoinTx(wallet, {
      recipients: [{ address: recipientAddress, amount: 1000 }],
      feeRate: { feeOption: 'Average' },
    });

    expect(result.isErr() && result.error.message).toContain(
      'Multiple Bitcoin accounts found (2)',
    );
  });

  it('fails for an amount that is not a whole number of satoshis', async () => {
    const { wallet } = await createLazyWallet();

    const result = await bitcoinEntry.buildBitcoinTx(wallet, {
      recipients: [{ address: recipientAddress, amount: 0.5 }],
      feeRate: { feeOption: 'Average' },
    });

    expect(result.isErr() && result.error.message).toContain(
      'Invalid amount 0.5',
    );
  });

  it('fails for an amount below the dust limit before resolving an account', async () => {
    const { wallet } = await createLazyWallet();
    bitcoinAccountWallets$.next({});

    const result = await bitcoinEntry.buildBitcoinTx(wallet, {
      recipients: [{ address: recipientAddress, amount: DUST_THRESHOLD - 1 }],
      feeRate: { feeOption: 'Average' },
    });

    expect(result.isErr() && result.error.message).toBe(
      `Amount 545 for ${recipientAddress} is below the dust limit of 546 satoshis`,
    );
  });

  it('accepts an amount equal to the dust limit', async () => {
    const { wallet } = await createLazyWallet();

    const result = await bitcoinEntry.buildBitcoinTx(wallet, {
      recipients: [{ address: recipientAddress, amount: DUST_THRESHOLD }],
      feeRate: { feeOption: 'Average' },
    });

    expect(result.isOk()).toBe(true);
  });

  it('fails when the funds do not cover the payment', async () => {
    const { wallet } = await createLazyWallet();

    const result = await bitcoinEntry.buildBitcoinTx(wallet, {
      recipients: [{ address: recipientAddress, amount: 20_000_000 }],
      feeRate: { feeOption: 'Average' },
    });

    const error = result.isErr() ? result.error : undefined;
    expect(error).toBeInstanceOf(bitcoinEntry.BitcoinTxBuildError);
    expect(
      error instanceof bitcoinEntry.BitcoinTxBuildError && error.code,
    ).toBe(bitcoinEntry.BitcoinTxBuildErrorCode.InsufficientFunds);
  });
});

describe('signBitcoinTx', { timeout: passwordTestTimeout }, () => {
  let entity: Awaited<ReturnType<typeof createInMemoryWalletEntity>>;

  // Only encrypted fixture data is shared; decryption and signing stay real
  // in a fresh wallet runtime for each test.
  beforeAll(async () => {
    const wallet = await createBitcoinWallet();
    entity = await createInMemoryWalletEntity(wallet, {
      mnemonicWords: words,
      walletName: 'In memory',
      password,
    });
  }, passwordTestTimeout);

  const createPasswordWallet = async ({ sync = true } = {}) => {
    const wallet = await createBitcoinWallet();
    await (sync
      ? addSyncedWallets(wallet, entity)
      : addWallets(wallet, entity));
    return { wallet, accountId: testnetAccountId(entity) };
  };

  it('signs for an in-memory wallet with its password', async () => {
    const { wallet } = await createPasswordWallet();
    const serializedTx = await buildUnsignedTx(wallet);

    const result = await bitcoinEntry.signBitcoinTx(wallet, {
      serializedTx,
      password,
    });

    const signed = JSON.parse(
      HexBytes.toUTF8(result.unwrap().serializedTx),
    ) as { network: string; hex: string };
    expect(signed.network).toBe(BitcoinNetwork.Testnet);
    const { ins } = Transaction.fromHex(signed.hex);
    expect(ins).not.toHaveLength(0);
    expect(ins.every(input => input.witness.length > 0)).toBe(true);
  });

  it('fails for an in-memory wallet without its password', async () => {
    const { wallet } = await createPasswordWallet();
    const serializedTx = await buildUnsignedTx(wallet);

    const result = await bitcoinEntry.signBitcoinTx(wallet, { serializedTx });

    expect(result.isErr() && result.error.message).toContain(
      'password is required for InMemory wallets',
    );
  });

  it('fails for an in-memory wallet with the wrong password', async () => {
    const { wallet } = await createPasswordWallet();
    const serializedTx = await buildUnsignedTx(wallet);

    const result = await bitcoinEntry.signBitcoinTx(wallet, {
      serializedTx,
      password: new TextEncoder().encode('wrong-password'),
    });

    expect(result.isErr()).toBe(true);
  });

  it('signs for a lazy wallet like the in-memory wallet of the same words', async () => {
    const lazy = await createLazyWallet();
    const serializedTx = await buildUnsignedTx(lazy.wallet);
    const inMemory = await createPasswordWallet({ sync: false });

    const lazySigned = await bitcoinEntry.signBitcoinTx(lazy.wallet, {
      serializedTx,
    });
    const inMemorySigned = await bitcoinEntry.signBitcoinTx(inMemory.wallet, {
      serializedTx,
      password,
    });

    expect(lazySigned.unwrap()).toEqual(inMemorySigned.unwrap());
  });

  it('fails when the lazy vault supplies the words of another wallet', async () => {
    const { wallet } = await createLazyWallet(withWords(otherWords));
    const serializedTx = await buildUnsignedTx(wallet);

    const result = await bitcoinEntry.signBitcoinTx(wallet, { serializedTx });

    expect(result.isErr() && result.error).toBeInstanceOf(
      LazyWalletMismatchError,
    );
  });
});

describe('waitForBitcoinAccountSync', () => {
  it('rejects with a TimeoutError when no account syncs in time', async () => {
    const wallet = await createBitcoinWallet();
    vi.useFakeTimers();

    const waiting = bitcoinEntry.waitForBitcoinAccountSync(wallet, {
      timeout: Milliseconds(1000),
    });
    const rejection = expect(waiting).rejects.toMatchObject({
      name: 'TimeoutError',
    });
    await vi.advanceTimersByTimeAsync(1000);

    await rejection;
  });
});

describe('submitBitcoinTx', () => {
  beforeEach(() => {
    chain.submitted.length = 0;
    chain.submission = 'accept';
  });

  const signedTx = async () => {
    const { wallet, accountId } = await createLazyWallet();
    const signed = await bitcoinEntry.signBitcoinTx(wallet, {
      serializedTx: await buildUnsignedTx(wallet),
    });
    return { wallet, accountId, serializedTx: signed.unwrap().serializedTx };
  };

  it('submits through the account wallet and records the pending transaction', async () => {
    const { wallet, accountId, serializedTx } = await signedTx();

    const result = await bitcoinEntry.submitBitcoinTx(wallet, {
      serializedTx,
    });

    const { txId } = result.unwrap();
    expect(chain.submitted).toEqual([
      (
        JSON.parse(HexBytes.toUTF8(serializedTx)) as {
          hex: string;
        }
      ).hex,
    ]);
    const pendingIds = await firstValueFrom(
      wallet.stateObservables.activities.selectPendingActivitiesByAccount$.pipe(
        map(pending =>
          (pending[accountId] ?? []).map(activity => activity.activityId),
        ),
        filter(ids => ids.length > 0),
        timeout(5000),
      ),
    );
    expect(pendingIds).toEqual([txId]);
  });

  it('fails when the provider rejects the transaction', async () => {
    const { wallet, serializedTx } = await signedTx();
    chain.submission = 'reject';

    const result = await bitcoinEntry.submitBitcoinTx(wallet, {
      serializedTx,
    });

    expect(result.isErr() && result.error.message).toContain(
      'Transaction submission failed',
    );
  });

  it('fails when the provider does not answer in time', async () => {
    const { wallet, serializedTx } = await signedTx();
    chain.submission = 'never';
    vi.useFakeTimers();

    const pending = bitcoinEntry.submitBitcoinTx(wallet, { serializedTx });
    await vi.advanceTimersByTimeAsync(60_000);
    const result = await pending;

    expect(result.isErr() && result.error.name).toBe('TimeoutError');
  });

  it('fails for a transaction on another network', async () => {
    const { wallet, accountId } = await createLazyWallet();

    const result = await bitcoinEntry.submitBitcoinTx(wallet, {
      serializedTx: HexBytes.fromUTF8(
        JSON.stringify({ network: BitcoinNetwork.Mainnet, hex: '00' }),
      ),
    });

    expect(result.isErr() && result.error.message).toBe(
      `The transaction is for the Bitcoin mainnet network, but account "${accountId}" is on testnet4`,
    );
    expect(chain.submitted).toEqual([]);
  });

  it('fails for a payload that is not a signed transaction', async () => {
    const { wallet } = await createLazyWallet();

    const result = await bitcoinEntry.submitBitcoinTx(wallet, {
      serializedTx: HexBytes.fromUTF8('{}'),
    });

    expect(result.isErr() && result.error.message).toBe(
      'Not a signed Bitcoin transaction',
    );
  });
});
