import { Cardano } from '@cardano-sdk/core';
import {
  BITCOIN_FEATURE_FLAG,
  BITCOIN_MEMPOOL_FEE_MARKET_FEATURE_FLAG,
  BitcoinNetwork,
  BitcoinNetworkId,
} from '@lace-contract/bitcoin-context';
import { FEATURE_FLAG_CARDANO } from '@lace-contract/cardano-context';
import { FEATURE_FLAG_NETWORK_TYPE } from '@lace-contract/network';
import { Milliseconds } from '@lace-lib/util';
import { describe, expect, it } from 'vitest';

import * as bitcoinEntry from '../src/bitcoin/index';
import { createInMemoryWalletEntity } from '../src/create-in-memory-wallet-entity';
import { createLaceWallet } from '../src/create-lace-wallet';
import * as m from '../src/modules';

import type { FeatureFlag } from '@lace-contract/feature';
import type { AppConfig } from '@lace-contract/module';

const words =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'.split(
    ' ',
  );
/** The BIP-84 test vector's mainnet account 0 key, in xpub encoding. */
const mainnetNativeSegWitKey =
  'xpub6CatWdiZiodmUeTDp8LT5or8nmbKNcuyvz7WyksVFkKB4RHwCD3XyuvPEbvqAQY3rAPshWcMLoP2fMFMKHPJ4ZeZXYVUhLv1VMrjPC7PW6V';

const bitcoinFeatureFlags: FeatureFlag[] = [
  { key: BITCOIN_FEATURE_FLAG },
  { key: BITCOIN_MEMPOOL_FEE_MARKET_FEATURE_FLAG },
  { key: FEATURE_FLAG_NETWORK_TYPE, payload: 'testnet' },
];

const maestroConfig = (baseUrl: string) => ({
  clientConfig: { baseUrl, apiVersion: 'v0', projectId: 'startup-test' },
  rateLimiterConfig: {
    size: 500,
    increaseAmount: 10,
    increaseInterval: Milliseconds(1000),
  },
});

const bitcoinConfig: Partial<AppConfig> = {
  bitcoinProvider: {
    tipPollFrequency: Milliseconds(60_000),
    historyDepth: 20,
    maestroConfig: {
      [BitcoinNetwork.Testnet]: maestroConfig(
        'https://xbt-testnet.gomaestro-api.org',
      ),
    },
  },
  bitcoinFeeMarketProvider: {
    mempoolSpaceConfig: {
      [BitcoinNetwork.Testnet]: { url: 'https://mempool.space/testnet4' },
    },
  },
};

const cardanoConfig: Partial<AppConfig> = {
  defaultTestnetChainId: Cardano.ChainIds.Preprod,
  cardanoProvider: {
    tipPollFrequency: Milliseconds(30_000),
    blockfrostConfigs: {
      1: {
        clientConfig: {
          baseUrl: 'https://cardano-preprod.blockfrost.io',
          apiVersion: 'v0',
          projectId: 'startup-test',
        },
        rateLimiterConfig: {
          size: 500,
          increaseAmount: 10,
          increaseInterval: Milliseconds(1000),
        },
      },
    },
  },
  cexplorerUrls: { 1: 'https://preprod.cexplorer.io' },
};

/**
 * Encrypting or decrypting a seed with a password takes several seconds on CI
 * runners.
 */
const passwordTestTimeout = 30_000;

const createBitcoinWallet = async () =>
  createLaceWallet({
    modules: [
      bitcoinEntry.m.featureDev,
      bitcoinEntry.m.storageInMemory,
      bitcoinEntry.m.blockchainBitcoin,
      bitcoinEntry.m.bitcoinProviderMaestro,
      bitcoinEntry.m.bitcoinMempoolFeeMarket,
    ] as const,
    environment: 'development',
    featureFlags: bitcoinFeatureFlags,
    config: {
      ...bitcoinConfig,
      defaultFeatureFlags: bitcoinFeatureFlags,
      extraFeatureFlags: [],
    },
  });

const blockchainsOf = (accounts: readonly { blockchainName: string }[]) => [
  ...new Set(accounts.map(({ blockchainName }) => blockchainName)),
];

describe('Bitcoin startup', { timeout: passwordTestTimeout }, () => {
  it('starts with only the Bitcoin modules and no Cardano flag', async () => {
    const wallet = await createBitcoinWallet();

    expect(wallet.getState().wallets?.ids).toEqual([]);
    expect(wallet.getState().cardanoContext).toBeUndefined();
    expect(
      wallet.stateObservables.addresses?.selectAllAddresses$,
    ).toBeDefined();
    expect(wallet.stateObservables.tokens?.selectAllTokens$).toBeDefined();
  });

  it('creates a lazy wallet with Bitcoin accounts and no stored seed without a password', async () => {
    const wallet = await createBitcoinWallet();

    const entity = await createInMemoryWalletEntity(wallet, {
      mnemonicWords: words,
      walletName: 'Bitcoin',
    });

    expect(entity.type).toBe(bitcoinEntry.WalletType.LazyInMemory);
    expect(blockchainsOf(entity.accounts)).toEqual(['Bitcoin']);
    expect(entity.accounts.map(account => account.accountType)).toEqual([
      'LazyInMemory',
      'LazyInMemory',
    ]);
    expect(
      entity.accounts.map(account => account.blockchainNetworkId).sort(),
    ).toEqual(
      [
        BitcoinNetworkId(BitcoinNetwork.Mainnet),
        BitcoinNetworkId(BitcoinNetwork.Testnet),
      ].sort(),
    );
    expect(
      entity.accounts.find(
        account =>
          account.blockchainNetworkId ===
          BitcoinNetworkId(BitcoinNetwork.Mainnet),
      )?.blockchainSpecific,
    ).toMatchObject({
      accountIndex: 0,
      extendedAccountPublicKeys: { nativeSegWit: mainnetNativeSegWitKey },
    });
    expect(entity.blockchainSpecific.Bitcoin).toBeUndefined();
  });

  it('creates an in-memory wallet with the same Bitcoin accounts and an encrypted seed with a password', async () => {
    const wallet = await createBitcoinWallet();
    const lazy = await createInMemoryWalletEntity(wallet, {
      mnemonicWords: words,
      walletName: 'Bitcoin',
    });

    const entity = await createInMemoryWalletEntity(wallet, {
      mnemonicWords: words,
      walletName: 'Bitcoin',
      password: new TextEncoder().encode('password'),
    });

    expect(entity.type).toBe(bitcoinEntry.WalletType.InMemory);
    expect(blockchainsOf(entity.accounts)).toEqual(['Bitcoin']);
    expect(entity.accounts.map(account => account.accountType)).toEqual([
      'InMemory',
      'InMemory',
    ]);
    expect(entity.accounts.map(account => account.blockchainSpecific)).toEqual(
      lazy.accounts.map(account => account.blockchainSpecific),
    );
    expect(entity.blockchainSpecific.Bitcoin?.encryptedRootPrivateKey).toMatch(
      /^[\da-f]+$/,
    );
  });

  it('starts with the Cardano and Bitcoin modules together and creates accounts for both chains', async () => {
    const featureFlags: FeatureFlag[] = [
      ...bitcoinFeatureFlags,
      { key: FEATURE_FLAG_CARDANO },
    ];
    const wallet = await createLaceWallet({
      modules: [
        m.featureDev,
        m.storageInMemory,
        m.blockchainCardano,
        m.cardanoProviderBlockfrost,
        m.cryptoCardanoSdk,
        m.blockchainBitcoin,
        m.bitcoinProviderMaestro,
        m.bitcoinMempoolFeeMarket,
      ] as const,
      environment: 'development',
      featureFlags,
      config: {
        ...cardanoConfig,
        ...bitcoinConfig,
        defaultFeatureFlags: featureFlags,
        extraFeatureFlags: [],
      },
    });

    expect(wallet.getState().wallets?.ids).toEqual([]);
    expect(
      wallet.stateObservables.cardanoContext?.selectAvailableAccountUtxos$,
    ).toBeDefined();

    const entity = await createInMemoryWalletEntity(wallet, {
      mnemonicWords: words,
      walletName: 'Cardano and Bitcoin',
    });

    expect(entity.type).toBe(bitcoinEntry.WalletType.LazyInMemory);
    expect(blockchainsOf(entity.accounts).sort()).toEqual([
      'Bitcoin',
      'Cardano',
    ]);
  });
});
