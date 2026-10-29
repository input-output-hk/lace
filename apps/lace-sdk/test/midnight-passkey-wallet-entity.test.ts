import { Cardano } from '@cardano-sdk/core';
import { FEATURE_FLAG_CARDANO } from '@lace-contract/cardano-context';
import {
  MidnightAccountId,
  MidnightNetworkId,
  MidnightSDKNetworkIds,
} from '@lace-contract/midnight-context';
import { FEATURE_FLAG_NETWORK_TYPE } from '@lace-contract/network';
import { WalletType } from '@lace-contract/wallet-repo';
import { Milliseconds } from '@lace-lib/util';
import { FEATURE_FLAG_MIDNIGHT } from '@lace-module/midnight-sync/sdk';
import { expect, it, vi } from 'vitest';

import { createLaceWallet } from '../src/create-lace-wallet';
import { createMidnightAccounts } from '../src/create-midnight-accounts';
import { createMidnightModule } from '../src/midnight-module';
import { createMidnightPasskeyWalletEntity } from '../src/midnight-passkey-wallet-entity';
import * as cardanoModules from '../src/modules-cardano';
import * as m from '../src/modules-midnight';

import type { FeatureFlag } from '@lace-contract/feature';
import type { MidnightAccountProps } from '@lace-contract/midnight-context';
import type * as LaceCore from '@lace-lib/core';
import type { PasskeyKeySource } from '@lace-lib/passkey';

// Sealing 3 keys per network with emip3 takes ~1s each in Node; the sealed
// bytes are not what this test asserts.
vi.mock('@lace-lib/core', async importActual => ({
  ...(await importActual<typeof LaceCore>()),
  SecretBox: {
    seal: async (data: Uint8Array) => data,
    open: async (data: Uint8Array) => data,
  },
}));

// The first wallet loads the engine's WASM, which takes seconds under full-suite load.
vi.setConfig({ testTimeout: 30_000 });

// A testnet-only fixture; holds nothing of value.
const words =
  'disorder river resist hold dinner glide rose find define olympic stairs fever bag story circle advice wasp when put slight matter place dizzy floor'.split(
    ' ',
  );
const password = new TextEncoder().encode('passkey-session');
const ref = {
  credentialId: 'AQID',
  rpId: 'localhost',
  recipeVersion: 'v1' as const,
};

const keySource = (): PasskeyKeySource => ({
  ensureCredential: vi.fn(async () => ref),
  credentialRef: vi.fn(() => ref),
  withPasskeyMnemonic: async use => use(words),
});

const createWallet = async (featureFlags: FeatureFlag[]) =>
  createLaceWallet({
    modules: [
      m.featureDev,
      m.storageInMemory,
      createMidnightModule({ password }),
    ] as const,
    environment: 'development',
    featureFlags,
    config: {
      defaultFeatureFlags: featureFlags,
      extraFeatureFlags: [],
      defaultMidnightTestnetNetworkId: MidnightSDKNetworkIds.Preview,
    },
  });

it('derives sealed Midnight accounts from the passkey words within one assertion', async () => {
  const wallet = await createWallet([
    { key: FEATURE_FLAG_MIDNIGHT },
    { key: FEATURE_FLAG_NETWORK_TYPE, payload: 'testnet' },
  ]);
  const source = keySource();

  const entity = await createMidnightPasskeyWalletEntity(wallet, {
    keySource: source,
    password,
    walletName: 'Midnight passkey',
  });

  expect(entity.type).toBe(WalletType.InMemory);
  const preview = entity.accounts.find(
    account =>
      account.blockchainName === 'Midnight' &&
      (account.blockchainSpecific as MidnightAccountProps).networkId ===
        MidnightSDKNetworkIds.Preview,
  );
  expect(preview?.accountId).toBe(
    MidnightAccountId(entity.walletId, 0, MidnightSDKNetworkIds.Preview),
  );
  expect(
    (preview?.blockchainSpecific as MidnightAccountProps).nightExternalKey
      .encryptedKey,
  ).toMatch(/^[\da-f]+$/);
  expect(entity.accounts.every(a => a.blockchainName === 'Midnight')).toBe(
    true,
  );
  // The words and the seed would unlock the passkey's every blockchain under
  // the password alone.
  expect(entity).not.toHaveProperty('encryptedRecoveryPhrase');
  expect(entity.blockchainSpecific).not.toHaveProperty('Midnight');
});

it('refuses a loadout that derived no Midnight account', async () => {
  const wallet = await createWallet([]);

  await expect(
    createMidnightPasskeyWalletEntity(wallet, {
      keySource: keySource(),
      password,
      walletName: 'Midnight passkey',
    }),
  ).rejects.toThrow('No Midnight account derived');
});

it('derives further accounts within the same assertion and keeps no seed', async () => {
  const wallet = await createWallet([
    { key: FEATURE_FLAG_MIDNIGHT },
    { key: FEATURE_FLAG_NETWORK_TYPE, payload: 'testnet' },
  ]);
  const source = keySource();
  const assertion = vi.spyOn(source, 'withPasskeyMnemonic');

  const entity = await createMidnightPasskeyWalletEntity(wallet, {
    keySource: source,
    password,
    walletName: 'Midnight passkey',
    accounts: [
      {
        accountIndex: 1,
        targetNetworks: new Set([
          MidnightNetworkId(MidnightSDKNetworkIds.Preview),
        ]),
      },
    ],
  });

  expect(assertion).toHaveBeenCalledTimes(1);
  expect(entity.accounts.map(account => account.accountId)).toContain(
    MidnightAccountId(entity.walletId, 1, MidnightSDKNetworkIds.Preview),
  );
  expect(entity).not.toHaveProperty('encryptedRecoveryPhrase');
  expect(entity.blockchainSpecific).not.toHaveProperty('Midnight');
  await expect(
    createMidnightAccounts(wallet, {
      wallet: entity,
      password,
      accountIndex: 2,
    }),
  ).rejects.toThrow('holds no Midnight seed');
});

it('derives no account of another blockchain the wallet loads', async () => {
  const wallet = await createLaceWallet({
    modules: [
      m.featureDev,
      m.storageInMemory,
      cardanoModules.blockchainCardano,
      cardanoModules.cardanoProviderBlockfrost,
      cardanoModules.cryptoCardanoSdk,
      createMidnightModule({ password }),
    ] as const,
    environment: 'development',
    featureFlags: [
      { key: FEATURE_FLAG_MIDNIGHT },
      { key: FEATURE_FLAG_CARDANO },
      { key: FEATURE_FLAG_NETWORK_TYPE, payload: 'testnet' },
    ],
    config: {
      defaultFeatureFlags: [],
      extraFeatureFlags: [],
      defaultMidnightTestnetNetworkId: MidnightSDKNetworkIds.Preview,
      defaultTestnetChainId: Cardano.ChainIds.Preprod,
      cardanoProvider: {
        tipPollFrequency: Milliseconds(30_000),
        blockfrostConfigs: {
          1: {
            clientConfig: {
              baseUrl: 'https://cardano-preprod.blockfrost.io',
              apiVersion: 'v0',
              projectId: 'midnight-passkey-test',
            },
            rateLimiterConfig: {
              size: 500,
              increaseAmount: 10,
              increaseInterval: Milliseconds(1000),
            },
          },
        },
      },
    },
  });

  const entity = await createMidnightPasskeyWalletEntity(wallet, {
    keySource: keySource(),
    password,
    walletName: 'Midnight passkey',
  });

  expect(
    new Set(entity.accounts.map(account => account.blockchainName)),
  ).toEqual(new Set(['Midnight']));
  expect(Object.keys(entity.blockchainSpecific)).toEqual([]);
});
