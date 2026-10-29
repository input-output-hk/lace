import { Cardano } from '@cardano-sdk/core';
import { FEATURE_FLAG_CARDANO } from '@lace-contract/cardano-context';
import { FEATURE_FLAG_NETWORK_TYPE } from '@lace-contract/network';
import { Milliseconds } from '@lace-lib/util';
import { firstValueFrom, filter, take, timeout } from 'rxjs';
import { expect, it, vi } from 'vitest';

import { createLaceWallet } from '../src/create-lace-wallet';
import * as m from '../src/modules-cardano';
import { createPasskeyVaultModule } from '../src/passkey-vault-module';
import { createPasskeyWalletEntity } from '../src/passkey-wallet-entity';

import type { CardanoBip32AccountProps } from '@lace-contract/cardano-context';
import type * as CardanoProviderCore from '@lace-lib/cardano-provider-core';
import type { PasskeyKeySource } from '@lace-lib/passkey';

const fixture = vi.hoisted(() => ({ requests: [] as string[] }));
vi.mock('@lace-lib/cardano-provider-core', async importActual => {
  const actual = await importActual<typeof CardanoProviderCore>();
  return {
    ...actual,
    getBlockfrostClient: () => ({
      request: async (endpoint: string) => {
        fixture.requests.push(endpoint);
        if (endpoint === 'blocks/latest')
          return {
            data: { height: 100000, hash: 'a'.repeat(64), slot: 50000000 },
          };
        if (endpoint === 'genesis')
          return {
            data: {
              active_slots_coefficient: 0.05,
              epoch_length: 432000,
              max_kes_evolutions: 62,
              max_lovelace_supply: '45000000000000000',
              network_magic: 1,
              security_param: 2160,
              slot_length: 1,
              slots_per_kes_period: 129600,
              system_start: 1506203091,
              update_quorum: 5,
            },
          };
        if (endpoint === 'network/eras')
          return {
            data: [
              {
                start: { time: 0, slot: 0, epoch: 0 },
                parameters: {
                  epoch_length: 21600,
                  slot_length: 20,
                  safe_zone: 4320,
                },
              },
            ],
          };
        if (endpoint === 'epochs/latest/parameters')
          return {
            data: {
              min_fee_a: 44,
              min_fee_b: 155381,
              max_block_size: 90112,
              max_tx_size: 16384,
              max_block_header_size: 1100,
              key_deposit: '2000000',
              pool_deposit: '500000000',
              e_max: 18,
              n_opt: 500,
              a0: '0.3',
              rho: '0.003',
              tau: '0.2',
              protocol_major_ver: 10,
              protocol_minor_ver: 0,
              min_pool_cost: '170000000',
              price_mem: '0.0577',
              price_step: '0.0000721',
              max_tx_ex_mem: '14000000',
              max_tx_ex_steps: '10000000000',
              max_block_ex_mem: '62000000',
              max_block_ex_steps: '20000000000',
              max_val_size: '5000',
              collateral_percent: 150,
              max_collateral_inputs: 3,
              coins_per_utxo_word: '4310',
              cost_models_raw: {},
            },
          };
        if (endpoint === 'network')
          return {
            data: {
              stake: { active: '0', live: '0' },
              supply: { circulating: '0', total: '45000000000000000' },
            },
          };
        if (
          /^accounts\/.*\/addresses\?/.test(endpoint) ||
          /^accounts\/.*\/utxos\?/.test(endpoint)
        )
          return { data: [] };
        throw new Error(`Unexpected Blockfrost request: ${endpoint}`);
      },
    }),
  };
});

it('discovers the first address and fetches UTXOs after adding a passkey lazy wallet', async () => {
  const keySource = {
    credentialRef: () => ({
      credentialId: 'AQID',
      rpId: 'localhost',
      recipeVersion: 'v1',
    }),
    withPasskeyMnemonic: async (
      use: (words: readonly string[]) => Promise<unknown>,
    ) =>
      use(
        'fame coconut utility print giraffe common twin evil alone exclude great echo since cart erode noise icon repair amused drip awake coral hat unveil'.split(
          ' ',
        ),
      ),
  } as unknown as PasskeyKeySource;
  const wallet = await createLaceWallet({
    modules: [
      m.featureDev,
      m.storageInMemory,
      m.blockchainCardano,
      m.cardanoProviderBlockfrost,
      m.cryptoCardanoSdk,
      createPasskeyVaultModule({ keySource }),
    ] as const,
    environment: 'development',
    featureFlags: [
      { key: FEATURE_FLAG_CARDANO },
      { key: FEATURE_FLAG_NETWORK_TYPE, payload: 'testnet' },
    ],
    config: {
      defaultFeatureFlags: [
        { key: FEATURE_FLAG_CARDANO },
        { key: FEATURE_FLAG_NETWORK_TYPE, payload: 'testnet' },
      ],
      extraFeatureFlags: [],
      defaultTestnetChainId: Cardano.ChainIds.Preprod,
      cardanoProvider: {
        tipPollFrequency: Milliseconds(30_000),
        blockfrostConfigs: {
          1: {
            clientConfig: {
              baseUrl: 'https://cardano-preprod.blockfrost.io',
              apiVersion: 'v0',
              projectId: 'discovery-test',
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
    },
  });
  const { entity } = await createPasskeyWalletEntity(wallet, {
    keySource,
    walletName: 'Preprod',
  });
  const preprodAccount = entity.accounts.find(
    account =>
      account.blockchainName === 'Cardano' &&
      Number(
        (account.blockchainSpecific as CardanoBip32AccountProps).chainId
          .networkMagic,
      ) === Number(Cardano.ChainIds.Preprod.networkMagic),
  );
  expect(preprodAccount).toBeDefined();
  wallet.dispatch('wallets.addWallet', entity);
  const addresses = await firstValueFrom(
    wallet.stateObservables.addresses.selectAllAddresses$.pipe(
      filter(items =>
        items.some(item => item.accountId === preprodAccount?.accountId),
      ),
      take(1),
      timeout(15_000),
    ),
  );
  expect(
    addresses.find(item => item.accountId === preprodAccount?.accountId)
      ?.address,
  ).toBe(
    'addr_test1qp0np478uj3lpl5ffk72m9t89rrgplcmxq6rz8lhk3yxeadwylevelqjsja5ucxf7kq6as840xtphdkr56t97fzhy7zqzmtjwh',
  );
  await firstValueFrom(
    wallet.stateObservables.cardanoContext.selectAvailableAccountUtxos$.pipe(
      filter(utxos => preprodAccount!.accountId in utxos),
      take(1),
      timeout(15_000),
    ),
  );
  expect(
    fixture.requests.some(endpoint =>
      /^accounts\/.*\/addresses\?/.test(endpoint),
    ),
  ).toBe(true);
  expect(
    fixture.requests.some(endpoint => /^accounts\/.*\/utxos\?/.test(endpoint)),
  ).toBe(true);
  const manualOperation = firstValueFrom(
    wallet.actionObservables.sync.addSyncOperation$.pipe(
      filter(action => action.payload.accountId === preprodAccount?.accountId),
      take(1),
      timeout(5_000),
    ),
  );
  wallet.dispatch('cardanoContext.requestManualAddressDiscovery', {
    accountId: preprodAccount!.accountId,
  });
  expect((await manualOperation).payload.operation.status).toBe('Pending');
});
