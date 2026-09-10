import { Cardano, ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { AddressType } from '@cardano-sdk/key-management';
import { LOVELACE_TOKEN_ID } from '@lace-contract/cardano-context';
import { Bip32Account } from '@lace-lib/core';
import { Blockchains } from '@lace-lib/ui-toolkit/src/design-system/atoms/icons/urls';
import { Milliseconds } from '@lace-lib/util';
import { isRetriableError } from '@lace-lib/util-provider';
import { firstValueFrom, toArray } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import {
  getCardanoAddresses,
  getCardanoUtxos,
  listWallets,
} from '../../src/lace-client';
import { initializeDependencies } from '../../src/store/dependencies';

import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type {
  CardanoProviderContext,
  CardanoRewardAccount,
} from '@lace-contract/cardano-context';
import type { ModuleInitProps } from '@lace-contract/module';
import type { BlockfrostConfig } from '@lace-lib/cardano-provider-core';
import type { CardanoUtxo, WalletInfo } from '@lace-lib/extension-shell-api';
import type { Result } from '@lace-lib/util';

// Every host read `store/dependencies.ts` imports — the address leaves under
// test are driven through the two the suite stubs; the rest never run here.
vi.mock('../../src/lace-client', () => ({
  getCardanoAddresses: vi.fn(),
  getCardanoParams: vi.fn(),
  getCardanoUtxos: vi.fn(),
  listWallets: vi.fn(),
  setActiveCardanoNetwork: vi.fn(),
  submitCardanoTx: vi.fn(),
}));

// libsodium's RNG probe reads `self` at instantiation (present in a browser
// context, absent in node) — the same shim the mappers suite uses.
(globalThis as Record<string, unknown>).self ??= globalThis;

// The golden account xpub (m/1852'/1815'/0'), shared with the mappers suite.
const ACCOUNT_XPUB =
  'b3f8aad750c8f498d2882d1ecd74bf550e81870e89acaed82e8e10ef5871887091286d601ecfe0aafc2121154db787bf489ccf35c6b5db5d60096052c8b34c2f';

const PREPROD = Cardano.ChainIds.Preprod;
const MAINNET = Cardano.ChainIds.Mainnet;

const hostWallet: WalletInfo = {
  walletId: 'w1',
  name: 'Wallet 1',
  order: 0,
  type: 'InMemory',
  cardanoAccounts: [
    {
      accountIndex: 0,
      xpub: ACCOUNT_XPUB,
      networkMagic: PREPROD.networkMagic,
      networkId: PREPROD.networkId,
      name: 'Account 1',
    },
  ],
  bitcoinAccounts: [],
};

const blockfrostConfig: BlockfrostConfig = {
  clientConfig: {
    baseUrl: 'https://blockfrost.test',
    apiVersion: 'v0',
    projectId: 'test-project-id',
  },
  rateLimiterConfig: {
    size: 1,
    increaseAmount: 1,
    increaseInterval: Milliseconds(1000),
  },
};

const init = async (
  blockfrostConfigs: Partial<Record<Cardano.NetworkMagic, BlockfrostConfig>>,
) =>
  initializeDependencies(
    {
      runtime: { config: { cardanoProvider: { blockfrostConfigs } } },
      // Crypto addons aren't exercised by the leaves under test; a dummy pair
      // is enough for initialization.
      loadModules: vi.fn().mockResolvedValue([{}]),
    } as unknown as ModuleInitProps,
    { logger: dummyLogger },
  );

describe('cardano-host-pull dependencies', () => {
  let crypto: ConstructorParameters<typeof Bip32Account>[1];

  beforeAll(async () => {
    crypto = await Bip32Account.createDefaultDependencies();
  });

  const initWithCrypto = async () =>
    initializeDependencies(
      {
        runtime: {
          config: {
            cardanoProvider: {
              blockfrostConfigs: { [PREPROD.networkMagic]: blockfrostConfig },
            },
          },
        },
        loadModules: vi.fn(async (name: string) => [
          name === 'addons.bip32Ed25519' ? crypto.bip32Ed25519 : crypto.blake2b,
        ]),
      } as unknown as ModuleInitProps,
      { logger: dummyLogger },
    );

  describe('getTokenMetadata (lovelace)', () => {
    it('returns ADA metadata with the Cardano icon and testnet ticker on preprod', async () => {
      const deps = await init({ [PREPROD.networkMagic]: blockfrostConfig });
      const context: CardanoProviderContext = { chainId: PREPROD };

      const result = await firstValueFrom(
        deps.cardanoProvider.getTokenMetadata(
          { tokenId: LOVELACE_TOKEN_ID },
          context,
        ),
      );

      expect(result.isOk()).toBe(true);
      if (!result.isOk()) throw new Error('expected Ok');
      expect(result.value.image).toBe(Blockchains.Cardano);
      expect(result.value.ticker).toBe('tADA');
    });

    it('returns the mainnet ticker on mainnet (per-network)', async () => {
      const deps = await init({ [MAINNET.networkMagic]: blockfrostConfig });
      const context: CardanoProviderContext = { chainId: MAINNET };

      const result = await firstValueFrom(
        deps.cardanoProvider.getTokenMetadata(
          { tokenId: LOVELACE_TOKEN_ID },
          context,
        ),
      );

      expect(result.isOk()).toBe(true);
      if (!result.isOk()) throw new Error('expected Ok');
      expect(result.value.image).toBe(Blockchains.Cardano);
      expect(result.value.ticker).toBe('ADA');
    });
  });

  describe('discoverAddresses', () => {
    let externalAddress: string;
    let secondStakeKeyAddress: string;
    let mainnetExternalAddress: string;

    beforeAll(async () => {
      const account = new Bip32Account(
        {
          extendedAccountPublicKey: ACCOUNT_XPUB as never,
          chainId: PREPROD,
          accountIndex: 0,
        },
        crypto,
      );
      externalAddress = (
        await account.deriveAddress({ type: AddressType.External, index: 0 }, 0)
      ).address;
      secondStakeKeyAddress = (
        await account.deriveAddress({ type: AddressType.External, index: 0 }, 1)
      ).address;
      const mainnetAccount = new Bip32Account(
        {
          extendedAccountPublicKey: ACCOUNT_XPUB as never,
          chainId: MAINNET,
          accountIndex: 0,
        },
        crypto,
      );
      mainnetExternalAddress = (
        await mainnetAccount.deriveAddress(
          { type: AddressType.External, index: 0 },
          0,
        )
      ).address;
    });

    const discover = async (addresses: string[], thorough?: boolean) => {
      vi.mocked(listWallets).mockResolvedValue({
        ok: true,
        value: [hostWallet],
      });
      vi.mocked(getCardanoAddresses).mockResolvedValue({
        ok: true,
        value: { addresses, internal: [], rewardAccounts: [] },
      });
      const deps = await initWithCrypto();
      return firstValueFrom(
        deps.cardanoProvider
          .discoverAddresses(
            {
              xpub: ACCOUNT_XPUB as Bip32PublicKeyHex,
              accountIndex: 0,
              ...(thorough === undefined ? {} : { thorough }),
            },
            { chainId: PREPROD },
          )
          .pipe(toArray()),
      );
    };

    it('reconstructs the host receive address', async () => {
      const results = await discover([externalAddress]);
      expect(results).toHaveLength(1);
      expect(results[0].isOk()).toBe(true);
    });

    it('serves a host address under a second stake key', async () => {
      const results = await discover([externalAddress, secondStakeKeyAddress]);
      expect(results).toHaveLength(2);
      expect(
        results.map(result =>
          result.isOk() ? String(result.value.address) : '',
        ),
      ).toEqual(
        expect.arrayContaining([externalAddress, secondStakeKeyAddress]),
      );
    });

    it('forwards thorough discovery to the host as forceRediscover', async () => {
      // The host owns the gap walk and persists it per (xpub, networkMagic)
      // without re-validating, so the AccountSettings "HD wallet sync" control
      // only does anything if `thorough` reaches it.
      await discover([externalAddress], true);
      expect(getCardanoAddresses).toHaveBeenLastCalledWith({
        walletId: 'w1',
        accountIndex: 0,
        networkMagic: PREPROD.networkMagic,
        forceRediscover: true,
      });
    });

    it('leaves automatic discovery on the host cached read', async () => {
      await discover([externalAddress]);
      expect(getCardanoAddresses).toHaveBeenLastCalledWith({
        walletId: 'w1',
        accountIndex: 0,
        networkMagic: PREPROD.networkMagic,
        forceRediscover: false,
      });
    });

    it('fails LOUD when a host address is not re-derivable from the xpub', async () => {
      // A MAINNET address served into a preprod context can never match.
      // Serving the rest would silently hide its utxos and history.
      const results = await discover([externalAddress, mainnetExternalAddress]);
      expect(results).toHaveLength(1);
      const [result] = results;
      expect(result.isOk()).toBe(false);
      if (result.isOk()) throw new Error('expected Err');
      expect(result.error).toBeInstanceOf(ProviderError);
      expect(result.error.message).toContain('only 1 matched');
    });
  });

  describe('getAccountUtxos (two stake keys)', () => {
    let stakeKeys: { address: string; rewardAccount: string }[];
    let enterpriseAddress: string;
    let hostUtxos: CardanoUtxo[];

    beforeAll(async () => {
      const account = new Bip32Account(
        {
          extendedAccountPublicKey: ACCOUNT_XPUB as never,
          chainId: PREPROD,
          accountIndex: 0,
        },
        crypto,
      );
      stakeKeys = await Promise.all(
        [0, 1, 2].map(async stakeIndex => {
          const grouped = await account.deriveAddress(
            { type: AddressType.External, index: 0 },
            stakeIndex,
          );
          return {
            address: grouped.address,
            rewardAccount: String(grouped.rewardAccount),
          };
        }),
      );
      const base = Cardano.Address.fromString(stakeKeys[0].address)?.asBase();
      if (!base) throw new Error('expected a base address');
      enterpriseAddress = String(
        Cardano.EnterpriseAddress.fromCredentials(
          PREPROD.networkId,
          base.getPaymentCredential(),
        )
          .toAddress()
          .toBech32(),
      );
      hostUtxos = [
        {
          txId: 'aa'.repeat(32),
          index: 0,
          address: stakeKeys[0].address,
          lovelace: '1000000',
        },
        {
          txId: 'bb'.repeat(32),
          index: 0,
          address: stakeKeys[1].address,
          lovelace: '2000000',
        },
        {
          txId: 'cc'.repeat(32),
          index: 0,
          address: enterpriseAddress,
          lovelace: '3000000',
        },
      ];
    });

    // The host serves the WHOLE account's utxos on every call, so both stake
    // keys see the same three outputs.
    const fetchUtxos = async (rewardAccount: string) => {
      vi.mocked(listWallets).mockResolvedValue({
        ok: true,
        value: [hostWallet],
      });
      vi.mocked(getCardanoAddresses).mockResolvedValue({
        ok: true,
        value: {
          addresses: [stakeKeys[0].address, stakeKeys[1].address],
          internal: [],
          rewardAccounts: [
            stakeKeys[0].rewardAccount,
            stakeKeys[1].rewardAccount,
          ],
        },
      });
      vi.mocked(getCardanoUtxos).mockResolvedValue({
        ok: true,
        value: { utxos: hostUtxos },
      });
      const deps = await initWithCrypto();
      return firstValueFrom(
        deps.cardanoProvider.getAccountUtxos(
          { rewardAccount: rewardAccount as CardanoRewardAccount },
          { chainId: PREPROD },
        ),
      );
    };

    const txIds = async (rewardAccount: string) => {
      const result = await fetchUtxos(rewardAccount);
      if (!result.isOk()) throw new Error('expected Ok');
      return result.value.map(([txIn]) => String(txIn.txId));
    };

    it('serves the primary stake key only its own utxos, plus the credential-less ones', async () => {
      expect(await txIds(stakeKeys[0].rewardAccount)).toEqual([
        'aa'.repeat(32),
        'cc'.repeat(32),
      ]);
    });

    it('serves the second stake key only its own utxos', async () => {
      expect(await txIds(stakeKeys[1].rewardAccount)).toEqual([
        'bb'.repeat(32),
      ]);
    });

    it('partitions the account set — the union is whole and the halves are disjoint', async () => {
      // The caller flatMaps one fetch per stake key: an overlap is a
      // double-counted outpoint (≈2× balance), a gap is value gone missing.
      const primary = await txIds(stakeKeys[0].rewardAccount);
      const second = await txIds(stakeKeys[1].rewardAccount);
      expect([...primary, ...second].sort()).toEqual(
        hostUtxos.map(utxo => utxo.txId).sort(),
      );
      expect(primary.filter(txId => second.includes(txId))).toEqual([]);
    });

    it('fails LOUD for a reward account no account owns', async () => {
      const result = await fetchUtxos(stakeKeys[2].rewardAccount);
      expect(result.isOk()).toBe(false);
      if (result.isOk()) throw new Error('expected Err');
      expect(result.error).toBeInstanceOf(ProviderError);
      expect(result.error.message).toContain('no wallet for reward account');
    });
  });

  describe('unprovisioned network', () => {
    it('emits an immediate non-retriable error instead of building a 403-churning client', async () => {
      // blockfrostConfigs omits the context's network magic => unprovisioned.
      const deps = await init({});
      const context: CardanoProviderContext = { chainId: PREPROD };

      // A synchronous emission proves the guard short-circuited before building
      // a blockfrost client / issuing an async request (which would only emit
      // on a later tick).
      let result: Result<Cardano.Tip, ProviderError> | undefined;
      deps.cardanoProvider.getTip(context).subscribe(value => {
        result = value;
      });

      expect(result).toBeDefined();
      if (!result) throw new Error('expected a synchronous emission');
      expect(result.isErr()).toBe(true);
      if (result.isOk()) throw new Error('expected Err');
      expect(result.error).toBeInstanceOf(ProviderError);
      expect(result.error.reason).toBe(ProviderFailure.NotImplemented);
      expect(isRetriableError(result.error)).toBe(false);
    });
  });
});
