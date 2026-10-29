import { Cardano } from '@cardano-sdk/core';
import { FEATURE_FLAG_CARDANO } from '@lace-contract/cardano-context';
import { FEATURE_FLAG_NETWORK_TYPE } from '@lace-contract/network';
import { AccountId } from '@lace-contract/wallet-repo';
import { Milliseconds } from '@lace-lib/util';
import { expect, it } from 'vitest';

import { createLaceWallet } from '../../src/create-lace-wallet';
import { CardanoCustodyModuleNotLoadedError } from '../../src/custody/cardano-custody-errors';
import { readCardanoCustodyAccountState } from '../../src/custody/cardano-custody-wallet';
import { blockchainCardanoCustody } from '../../src/custody/modules';
import { observeCardanoCustodyAccountState } from '../../src/custody/observe-cardano-custody-account-state';
import { observeCardanoCustodyGrantStatuses } from '../../src/custody/observe-cardano-custody-grant-statuses';
import { requestCardanoCustodyBuild } from '../../src/custody/request-cardano-custody-build';
import * as m from '../../src/modules-cardano';

import type { WalletWithCardanoCustody } from '../../src/custody/cardano-custody-wallet';

/**
 * The wallets these tests create keep running, so they stay out of
 * cardano-startup.test.ts, whose analytics test counts every event.
 */
const cardanoFlags = [
  { key: FEATURE_FLAG_CARDANO },
  { key: FEATURE_FLAG_NETWORK_TYPE, payload: 'testnet' },
];

const cardanoConfig = {
  defaultFeatureFlags: cardanoFlags,
  extraFeatureFlags: [],
  defaultTestnetChainId: Cardano.ChainIds.Preprod,
  cardanoProvider: {
    tipPollFrequency: Milliseconds(30_000),
    blockfrostConfigs: {
      1: {
        clientConfig: {
          baseUrl: 'https://cardano-preprod.blockfrost.io',
          apiVersion: 'v0' as const,
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

it('carries no custody store without the custody module', async () => {
  const wallet = await createLaceWallet({
    modules: [
      m.featureDev,
      m.storageInMemory,
      m.blockchainCardano,
      m.cardanoProviderBlockfrost,
      m.cryptoCardanoSdk,
    ] as const,
    environment: 'development',
    featureFlags: cardanoFlags,
    config: cardanoConfig,
  });
  expect(wallet.stateObservables).not.toHaveProperty('cardanoCustody');
  expect(wallet.actionObservables).not.toHaveProperty('cardanoCustody');
  expect(wallet.actionObservables.cardanoContext).not.toHaveProperty(
    'buildCustodyTransaction$',
  );
});

it('refuses the custody helpers a wallet without the custody module', async () => {
  const wallet = (await createLaceWallet({
    modules: [
      m.featureDev,
      m.storageInMemory,
      m.blockchainCardano,
      m.cardanoProviderBlockfrost,
      m.cryptoCardanoSdk,
    ] as const,
    environment: 'development',
    featureFlags: cardanoFlags,
    config: cardanoConfig,
  })) as unknown as WalletWithCardanoCustody;
  const accountId = AccountId('custody-account');

  expect(() => observeCardanoCustodyAccountState(wallet, accountId)).toThrow(
    CardanoCustodyModuleNotLoadedError,
  );
  expect(() => observeCardanoCustodyGrantStatuses(wallet, accountId)).toThrow(
    CardanoCustodyModuleNotLoadedError,
  );
  await expect(
    readCardanoCustodyAccountState(wallet, accountId),
  ).rejects.toThrow(CardanoCustodyModuleNotLoadedError);
  await expect(
    requestCardanoCustodyBuild(wallet, {
      kind: 'sweep',
      accountId,
    } as unknown as Parameters<typeof requestCardanoCustodyBuild>[1]),
  ).rejects.toThrow(CardanoCustodyModuleNotLoadedError);
});

it('refuses the custody module without the Cardano modules', async () => {
  await expect(
    createLaceWallet({
      modules: [
        m.featureDev,
        m.storageInMemory,
        blockchainCardanoCustody,
        m.cryptoCardanoSdk,
      ] as const,
      environment: 'development',
      featureFlags: cardanoFlags,
      config: cardanoConfig,
    }),
  ).rejects.toThrow(/cardano-provider-store/);
});

it('loads the custody store with the custody module', async () => {
  const wallet = await createLaceWallet({
    modules: [
      m.featureDev,
      m.storageInMemory,
      m.blockchainCardano,
      blockchainCardanoCustody,
      m.cardanoProviderBlockfrost,
      m.cryptoCardanoSdk,
    ] as const,
    environment: 'development',
    featureFlags: cardanoFlags,
    config: cardanoConfig,
  });
  expect(
    wallet.stateObservables.cardanoCustody.selectCardanoCustodyAccountState$,
  ).toBeDefined();
  expect(
    wallet.actionObservables.cardanoCustody.buildCustodyTransactionCompleted$,
  ).toBeDefined();
});
