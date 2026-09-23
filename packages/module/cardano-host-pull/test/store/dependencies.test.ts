import { Cardano, ProviderError, ProviderFailure } from '@cardano-sdk/core';
import { AddressType } from '@cardano-sdk/key-management';
import { LOVELACE_TOKEN_ID } from '@lace-contract/cardano-context';
import { Bip32Account } from '@lace-lib/core';
import { Blockchains } from '@lace-lib/ui-toolkit/src/design-system/atoms/icons/urls';
import { Milliseconds } from '@lace-lib/util';
import {
  measureRequestsUnderRetry,
  PERMANENT_STATUS,
  RETRIABLE_STATUS,
} from '@lace-lib/util-dev';
import {
  HttpClientError,
  isRetriableError,
  PROVIDER_REQUEST_RETRY_CONFIG,
} from '@lace-lib/util-provider';
import { firstValueFrom, toArray } from 'rxjs';
import { dummyLogger } from 'ts-log';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  getCardanoAddresses,
  getCardanoParams,
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
import type { TokenId } from '@lace-contract/tokens';
import type * as CardanoProviderCore from '@lace-lib/cardano-provider-core';
import type { BlockfrostConfig } from '@lace-lib/cardano-provider-core';
import type {
  CardanoParams,
  CardanoUtxo,
  WalletInfo,
} from '@lace-lib/extension-shell-api';
import type { Result } from '@lace-lib/util';

const transport = vi.hoisted(() => ({
  issued: [] as string[],
  respond: async (_endpoint: string): Promise<{ data: unknown }> => ({
    data: {},
  }),
}));

// Only the client is faked, so the real provider, config guard and memoization
// stay in the path. It must be one FIXED client: the provider is memoized on
// the config identifier, so a per-test client would be discarded.
vi.mock('@lace-lib/cardano-provider-core', async importActual => {
  const actual = await importActual<typeof CardanoProviderCore>();
  return {
    ...actual,
    getBlockfrostClient: () => ({
      request: async (endpoint: string) => {
        transport.issued.push(endpoint);
        return transport.respond(endpoint);
      },
    }),
  };
});

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

const PROTOCOL_PARAMETERS_ENDPOINT = 'epochs/latest/parameters';
const GENESIS_ENDPOINT = 'genesis';
const ERAS_ENDPOINT = 'network/eras';
/** `eraSummaries()` reads the system start first, and nothing caches it. */
const ERA_SUMMARIES_ATTEMPT = [GENESIS_ENDPOINT, ERAS_ENDPOINT];

/** A 28-byte policy id followed by the asset name `test`. */
const TOKEN_ID = `${'a'.repeat(56)}74657374` as TokenId;
const TOKEN_ENDPOINT = `assets/${TOKEN_ID}`;

/** `rho`/`a0`/`tau` are stringified by the SDK mapper — omit them and it throws. */
const PROTOCOL_PARAMETERS_RESPONSE = {
  data: { min_fee_a: 44, min_fee_b: 155_381, rho: 0.003, a0: 0.3, tau: 0.2 },
};

const HOST_PARAMS: CardanoParams = {
  minFeeCoefficient: 99,
  minFeeConstant: 155_381,
  coinsPerUtxoByte: 4310,
  maxTxSize: 16_384,
  maxValueSize: 5000,
  collateralPercentage: 150,
  maxCollateralInputs: 3,
  stakeKeyDeposit: 2_000_000,
  poolDeposit: 500_000_000,
  desiredNumberOfPools: 500,
  monetaryExpansion: '0.003',
  poolInfluence: '0.3',
  prices: { memory: 0.0577, steps: 0.000_072_1 },
};

const GENESIS_RESPONSE = {
  data: {
    active_slots_coefficient: 0.05,
    epoch_length: 432_000,
    max_kes_evolutions: 62,
    max_lovelace_supply: '45000000000000000',
    network_magic: PREPROD.networkMagic,
    security_param: 2160,
    slot_length: 1,
    slots_per_kes_period: 129_600,
    system_start: 1_506_203_091,
    update_quorum: 5,
  },
};

const ERAS_RESPONSE = {
  data: [
    {
      start: { time: 0, slot: 0, epoch: 0 },
      end: { time: 89_856_000, slot: 4_492_800, epoch: 208 },
      parameters: { epoch_length: 21_600, slot_length: 20, safe_zone: 4320 },
    },
  ],
};

const TOKEN_RESPONSE = {
  data: {
    asset: TOKEN_ID,
    policy_id: 'a'.repeat(56),
    asset_name: '74657374',
    fingerprint: 'asset1384n874tzkcgkp2uanujjew8evjfvwevqfddap',
    quantity: '1000',
    initial_mint_tx_hash: 'a'.repeat(64),
    mint_or_burn_count: 1,
    onchain_metadata: null,
    metadata: { name: 'Tok', ticker: 'TOK', decimals: 6 },
  },
};

/**
 * The eras leg is downstream of the genesis leg, so a transport that fails
 * everything never reaches it and measures the wrong request.
 */
const genesisOkThen = (status: number) => async (endpoint: string) => {
  if (endpoint === GENESIS_ENDPOINT) return GENESIS_RESPONSE;
  throw new HttpClientError(status, 'injected');
};

const failWith = (status: number) => async () => {
  throw new HttpClientError(status, 'injected');
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

  describe('resolveInput', () => {
    const txIn = {
      txId: Cardano.TransactionId(
        '4444444444444444444444444444444444444444444444444444444444444444',
      ),
      index: 0,
    };
    const endpoint = `txs/${txIn.txId}/utxos`;
    const context: CardanoProviderContext = { chainId: PREPROD };

    beforeEach(() => {
      vi.useFakeTimers();
      transport.issued.length = 0;
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('re-issues its request on every retry attempt', async () => {
      transport.respond = async () => {
        throw new HttpClientError(RETRIABLE_STATUS, 'unhealthy');
      };
      const deps = await init({ [PREPROD.networkMagic]: blockfrostConfig });

      const attempts = await measureRequestsUnderRetry({
        call: () => deps.cardanoProvider.resolveInput(txIn, context),
        requests: () => transport.issued,
        retry: PROVIDER_REQUEST_RETRY_CONFIG,
      });

      expect(attempts).toEqual(Array.from({ length: 4 }, () => endpoint));
    });

    it('issues one request when the failure is permanent', async () => {
      transport.respond = async () => {
        throw new HttpClientError(PERMANENT_STATUS, 'forbidden');
      };
      const deps = await init({ [PREPROD.networkMagic]: blockfrostConfig });

      const attempts = await measureRequestsUnderRetry({
        call: () => deps.cardanoProvider.resolveInput(txIn, context),
        requests: () => transport.issued,
        retry: PROVIDER_REQUEST_RETRY_CONFIG,
      });

      expect(attempts).toEqual([endpoint]);
    });

    it('issues no request until something subscribes', async () => {
      transport.respond = async () => {
        throw new HttpClientError(RETRIABLE_STATUS, 'unhealthy');
      };
      const deps = await init({ [PREPROD.networkMagic]: blockfrostConfig });

      deps.cardanoProvider.resolveInput(txIn, context);
      await vi.advanceTimersByTimeAsync(0);

      expect(transport.issued).toEqual([]);
    });

    it('never reaches the transport on an unprovisioned network', async () => {
      const deps = await init({});

      const result = await firstValueFrom(
        deps.cardanoProvider.resolveInput(txIn, context),
      );

      expect(result.isErr()).toBe(true);
      expect(transport.issued).toEqual([]);
    });
  });

  describe('getProtocolParameters', () => {
    const context: CardanoProviderContext = { chainId: PREPROD };

    beforeEach(() => {
      vi.useFakeTimers();
      transport.issued.length = 0;
      vi.mocked(getCardanoParams).mockReset();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('re-issues both arms on every retry attempt', async () => {
      transport.respond = failWith(RETRIABLE_STATUS);
      vi.mocked(getCardanoParams).mockResolvedValue({
        ok: true,
        value: HOST_PARAMS,
      });
      const deps = await init({ [PREPROD.networkMagic]: blockfrostConfig });

      const attempts = await measureRequestsUnderRetry({
        call: () => deps.cardanoProvider.getProtocolParameters(context),
        requests: () => transport.issued,
        retry: PROVIDER_REQUEST_RETRY_CONFIG,
      });

      expect(attempts).toEqual(
        Array.from({ length: 4 }, () => PROTOCOL_PARAMETERS_ENDPOINT),
      );
      expect(vi.mocked(getCardanoParams)).toHaveBeenCalledTimes(4);
    });

    it('re-asks the host when the HOST arm is the one that fails', async () => {
      transport.respond = async () => PROTOCOL_PARAMETERS_RESPONSE;
      vi.mocked(getCardanoParams).mockResolvedValue({
        ok: false,
        error: { code: 'internal', message: 'host busy' },
      });
      const deps = await init({ [PREPROD.networkMagic]: blockfrostConfig });

      await measureRequestsUnderRetry({
        call: () => deps.cardanoProvider.getProtocolParameters(context),
        requests: () => transport.issued,
        retry: PROVIDER_REQUEST_RETRY_CONFIG,
      });

      expect(vi.mocked(getCardanoParams)).toHaveBeenCalledTimes(4);
    });

    it('stops retrying once a transient host failure clears', async () => {
      transport.respond = async () => PROTOCOL_PARAMETERS_RESPONSE;
      vi.mocked(getCardanoParams)
        .mockResolvedValueOnce({
          ok: false,
          error: { code: 'internal', message: 'host busy' },
        })
        .mockResolvedValue({ ok: true, value: HOST_PARAMS });
      const deps = await init({ [PREPROD.networkMagic]: blockfrostConfig });

      const attempts = await measureRequestsUnderRetry({
        call: () => deps.cardanoProvider.getProtocolParameters(context),
        requests: () => transport.issued,
        retry: PROVIDER_REQUEST_RETRY_CONFIG,
      });

      expect(attempts).toEqual(
        Array.from({ length: 2 }, () => PROTOCOL_PARAMETERS_ENDPOINT),
      );
      expect(vi.mocked(getCardanoParams)).toHaveBeenCalledTimes(2);
    });

    it('issues one request per arm when the blockfrost failure is permanent', async () => {
      transport.respond = failWith(PERMANENT_STATUS);
      vi.mocked(getCardanoParams).mockResolvedValue({
        ok: true,
        value: HOST_PARAMS,
      });
      const deps = await init({ [PREPROD.networkMagic]: blockfrostConfig });

      const attempts = await measureRequestsUnderRetry({
        call: () => deps.cardanoProvider.getProtocolParameters(context),
        requests: () => transport.issued,
        retry: PROVIDER_REQUEST_RETRY_CONFIG,
      });

      expect(attempts).toEqual([PROTOCOL_PARAMETERS_ENDPOINT]);
      expect(vi.mocked(getCardanoParams)).toHaveBeenCalledTimes(1);
    });

    it('lets the host value win over blockfrost on the shared subset', async () => {
      transport.respond = async () => PROTOCOL_PARAMETERS_RESPONSE;
      vi.mocked(getCardanoParams).mockResolvedValue({
        ok: true,
        value: HOST_PARAMS,
      });
      const deps = await init({ [PREPROD.networkMagic]: blockfrostConfig });

      const result = await firstValueFrom(
        deps.cardanoProvider.getProtocolParameters(context),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) expect(result.value.minFeeCoefficient).toBe(99);
      expect(transport.issued).toEqual([PROTOCOL_PARAMETERS_ENDPOINT]);
      expect(vi.mocked(getCardanoParams)).toHaveBeenCalledTimes(1);
    });

    it('asks neither arm until something subscribes', async () => {
      transport.respond = failWith(RETRIABLE_STATUS);
      vi.mocked(getCardanoParams).mockResolvedValue({
        ok: true,
        value: HOST_PARAMS,
      });
      const deps = await init({ [PREPROD.networkMagic]: blockfrostConfig });

      deps.cardanoProvider.getProtocolParameters(context);
      await vi.advanceTimersByTimeAsync(0);

      expect(transport.issued).toEqual([]);
      expect(vi.mocked(getCardanoParams)).not.toHaveBeenCalled();
    });

    it('never reaches either arm on an unprovisioned network', async () => {
      const deps = await init({});

      const result = await firstValueFrom(
        deps.cardanoProvider.getProtocolParameters(context),
      );

      expect(result.isErr()).toBe(true);
      expect(transport.issued).toEqual([]);
      expect(vi.mocked(getCardanoParams)).not.toHaveBeenCalled();
    });
  });

  describe('getEraSummaries', () => {
    const context: CardanoProviderContext = { chainId: PREPROD };

    beforeEach(() => {
      vi.useFakeTimers();
      transport.issued.length = 0;
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('re-issues both of its requests on every retry attempt', async () => {
      transport.respond = genesisOkThen(RETRIABLE_STATUS);
      const deps = await init({ [PREPROD.networkMagic]: blockfrostConfig });

      const attempts = await measureRequestsUnderRetry({
        call: () => deps.cardanoProvider.getEraSummaries(context),
        requests: () => transport.issued,
        retry: PROVIDER_REQUEST_RETRY_CONFIG,
      });

      expect(attempts).toEqual(
        Array.from({ length: 4 }, () => ERA_SUMMARIES_ATTEMPT).flat(),
      );
    });

    it('issues one attempt when the failure is permanent', async () => {
      transport.respond = genesisOkThen(PERMANENT_STATUS);
      const deps = await init({ [PREPROD.networkMagic]: blockfrostConfig });

      const attempts = await measureRequestsUnderRetry({
        call: () => deps.cardanoProvider.getEraSummaries(context),
        requests: () => transport.issued,
        retry: PROVIDER_REQUEST_RETRY_CONFIG,
      });

      expect(attempts).toEqual(ERA_SUMMARIES_ATTEMPT);
    });

    it('issues one attempt and parses the summaries when the provider answers', async () => {
      transport.respond = async endpoint =>
        endpoint === GENESIS_ENDPOINT ? GENESIS_RESPONSE : ERAS_RESPONSE;
      const deps = await init({ [PREPROD.networkMagic]: blockfrostConfig });

      const result = await firstValueFrom(
        deps.cardanoProvider.getEraSummaries(context),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].parameters.epochLength).toBe(21_600);
      }
      expect(transport.issued).toEqual(ERA_SUMMARIES_ATTEMPT);
    });

    it('issues no request until something subscribes', async () => {
      transport.respond = genesisOkThen(RETRIABLE_STATUS);
      const deps = await init({ [PREPROD.networkMagic]: blockfrostConfig });

      deps.cardanoProvider.getEraSummaries(context);
      await vi.advanceTimersByTimeAsync(0);

      expect(transport.issued).toEqual([]);
    });

    it('never reaches the transport on an unprovisioned network', async () => {
      const deps = await init({});

      const result = await firstValueFrom(
        deps.cardanoProvider.getEraSummaries(context),
      );

      expect(result.isErr()).toBe(true);
      expect(transport.issued).toEqual([]);
    });
  });

  describe('getTokenMetadata', () => {
    const context: CardanoProviderContext = { chainId: PREPROD };

    beforeEach(() => {
      vi.useFakeTimers();
      transport.issued.length = 0;
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('re-issues its request on every retry attempt', async () => {
      transport.respond = failWith(RETRIABLE_STATUS);
      const deps = await init({ [PREPROD.networkMagic]: blockfrostConfig });

      const attempts = await measureRequestsUnderRetry({
        call: () =>
          deps.cardanoProvider.getTokenMetadata({ tokenId: TOKEN_ID }, context),
        requests: () => transport.issued,
        retry: PROVIDER_REQUEST_RETRY_CONFIG,
      });

      expect(attempts).toEqual(Array.from({ length: 4 }, () => TOKEN_ENDPOINT));
    });

    it('issues one request when the failure is permanent', async () => {
      transport.respond = failWith(PERMANENT_STATUS);
      const deps = await init({ [PREPROD.networkMagic]: blockfrostConfig });

      const attempts = await measureRequestsUnderRetry({
        call: () =>
          deps.cardanoProvider.getTokenMetadata({ tokenId: TOKEN_ID }, context),
        requests: () => transport.issued,
        retry: PROVIDER_REQUEST_RETRY_CONFIG,
      });

      expect(attempts).toEqual([TOKEN_ENDPOINT]);
    });

    it('issues one request and maps the metadata when the provider answers', async () => {
      transport.respond = async () => TOKEN_RESPONSE;
      const deps = await init({ [PREPROD.networkMagic]: blockfrostConfig });

      const result = await firstValueFrom(
        deps.cardanoProvider.getTokenMetadata({ tokenId: TOKEN_ID }, context),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) expect(result.value.ticker).toBe('TOK');
      expect(transport.issued).toEqual([TOKEN_ENDPOINT]);
    });

    it('throws for a malformed token id instead of deferring a retriable failure', async () => {
      const deps = await init({ [PREPROD.networkMagic]: blockfrostConfig });

      expect(() =>
        deps.cardanoProvider.getTokenMetadata(
          { tokenId: 'not-hex' as TokenId },
          context,
        ),
      ).toThrow('expected hex string');
      expect(transport.issued).toEqual([]);
    });

    it('issues no request until something subscribes', async () => {
      transport.respond = failWith(RETRIABLE_STATUS);
      const deps = await init({ [PREPROD.networkMagic]: blockfrostConfig });

      deps.cardanoProvider.getTokenMetadata({ tokenId: TOKEN_ID }, context);
      await vi.advanceTimersByTimeAsync(0);

      expect(transport.issued).toEqual([]);
    });

    it('never reaches the transport on an unprovisioned network', async () => {
      const deps = await init({});

      const result = await firstValueFrom(
        deps.cardanoProvider.getTokenMetadata({ tokenId: TOKEN_ID }, context),
      );

      expect(result.isErr()).toBe(true);
      expect(transport.issued).toEqual([]);
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
