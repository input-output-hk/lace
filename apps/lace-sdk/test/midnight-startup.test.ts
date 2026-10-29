import {
  midnightWalletsForRuntime,
  MidnightAccountId,
  MidnightNetworkId,
  MidnightSDKNetworkIds,
  FEATURE_FLAG_MIDNIGHT_TEE_TEMENOS_PROOF_SERVER,
  TEMENOS_PROOF_SERVER_MODES,
} from '@lace-contract/midnight-context';
import * as stubData from '@lace-contract/midnight-context/src/stub-data';
import { FEATURE_FLAG_NETWORK_TYPE } from '@lace-contract/network';
import { AccountId } from '@lace-contract/wallet-repo';
import { SecretBox } from '@lace-lib/core';
import { FEATURE_FLAG_MIDNIGHT } from '@lace-module/midnight-sync/sdk';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import { createKeystore } from '@midnightntwrk/wallet-sdk/unshielded';
import {
  DustAddress,
  ShieldedAddress,
  ShieldedCoinPublicKey,
  ShieldedEncryptionPublicKey,
} from '@midnightntwrk/wallet-sdk-address-format';
import { filter, firstValueFrom, of, throwError, timeout } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { createLaceWallet } from '../src/create-lace-wallet';
import {
  createInMemoryWalletEntity,
  createMidnightAccounts,
} from '../src/midnight';
import { MidnightNetworkNotConfiguredError } from '../src/midnight-errors';
import {
  createMidnightModule,
  MIDNIGHT_LOCAL_PROOF_SERVER_URL,
  MIDNIGHT_PREVIEW_INDEXER_URL,
  MIDNIGHT_PREVIEW_NODE_URL,
  MIDNIGHT_PUBLIC_ENDPOINTS,
} from '../src/midnight-module';
import { midnightWalletFor, withMidnightWallet } from '../src/midnight-wallet';
import * as m from '../src/modules-midnight';
import { selectMidnightNetwork } from '../src/select-midnight-network';

import type { CreateMidnightModuleProps } from '../src/midnight-module';
import type { FeatureFlag } from '@lace-contract/feature';
import type {
  MidnightWallet as Engine,
  MidnightWalletsByAccountId,
  MidnightSDKNetworkId,
  MidnightSDKTestNetworkId,
  PartialMidnightNetworksConfig,
  ProofServerMode,
  MidnightAccountProps,
} from '@lace-contract/midnight-context';
import type * as LaceCore from '@lace-lib/core';
import type { BehaviorSubject } from 'rxjs';

// Derivation is real; password encryption is covered by SecretBox's own tests.
vi.mock('@lace-lib/core', async importActual => ({
  ...(await importActual<typeof LaceCore>()),
  SecretBox: {
    seal: vi.fn(async (data: Uint8Array) => Uint8Array.from(data)),
    open: vi.fn(async (data: Uint8Array) => Uint8Array.from(data)),
  },
}));

// The first wallet loads the engine's WASM, which takes seconds under full-suite load.
vi.setConfig({ testTimeout: 30_000 });

const password = new TextEncoder().encode('startup-test');
const featureFlags = [
  { key: FEATURE_FLAG_MIDNIGHT },
  { key: FEATURE_FLAG_NETWORK_TYPE, payload: 'testnet' },
];
const LOCAL_PROOF_SERVER: ProofServerMode = {
  kind: 'local-host',
  url: MIDNIGHT_LOCAL_PROOF_SERVER_URL,
};
const REMOTE_PROOF_SERVER: ProofServerMode = {
  kind: 'delegated',
  url: 'https://prover.example',
  label: 'prover.example',
};
const publicNetworkIds: MidnightSDKNetworkId[] = [
  MidnightSDKNetworkIds.MainNet,
  MidnightSDKNetworkIds.PreProd,
  MidnightSDKNetworkIds.Preview,
  MidnightSDKNetworkIds.QaNet,
];

const createMidnightWallet = async (
  props: Omit<CreateMidnightModuleProps, 'password'> = {},
  {
    flags = featureFlags,
    defaultMidnightTestnetNetworkId = MidnightSDKNetworkIds.Preview,
  }: {
    flags?: FeatureFlag[];
    defaultMidnightTestnetNetworkId?: MidnightSDKTestNetworkId;
  } = {},
) =>
  createLaceWallet({
    modules: [
      m.featureDev,
      m.storageInMemory,
      createMidnightModule({ password, ...props }),
    ] as const,
    environment: 'development',
    featureFlags: flags,
    config: {
      defaultFeatureFlags: flags,
      extraFeatureFlags: [],
      defaultMidnightTestnetNetworkId,
    },
  });
type MidnightWallet = Awaited<ReturnType<typeof createMidnightWallet>>;

// The supported networks and default provers hold once the wallet is
// created. The endpoint overrides come from side effects, which start one tick
// after the store with each dispatch in its own tick, so a test waits for the
// end state it asserts on. The store keeps only the overrides that differ from
// the contract defaults.
const overridesApplied = async (
  wallet: MidnightWallet,
  applied: (overrides: PartialMidnightNetworksConfig) => boolean,
) =>
  firstValueFrom(
    wallet.stateObservables.midnightContext.selectNetworksConfigUserOverrides$.pipe(
      filter(applied),
      timeout(5000),
    ),
  );
const nodeApplied =
  (...networkIds: MidnightSDKNetworkId[]) =>
  (overrides: PartialMidnightNetworksConfig) =>
    networkIds.every(
      networkId => overrides[networkId].nodeAddress !== undefined,
    );
// QANet's public endpoints equal the contract defaults, so no override is stored.
const publicApplied = nodeApplied(
  MidnightSDKNetworkIds.MainNet,
  MidnightSDKNetworkIds.PreProd,
  MidnightSDKNetworkIds.Preview,
);

const currentNetwork = async (wallet: MidnightWallet) =>
  firstValueFrom(wallet.stateObservables.midnightContext.selectCurrentNetwork$);
const sorted = (networkIds: readonly MidnightSDKNetworkId[] = []) =>
  [...networkIds].sort();

describe('Midnight loadout', () => {
  it('restores index zero and a nonzero index from the same phrase through public helpers', async () => {
    const wallet = await createMidnightWallet();
    const restore = async () => {
      const entity = await createInMemoryWalletEntity(wallet, {
        mnemonicWords: stubData.mnemonic.split(' '),
        password,
        walletName: 'restore',
      });
      return createMidnightAccounts(wallet, {
        wallet: entity,
        password,
        accountIndex: 7,
        targetNetworks: new Set([
          MidnightNetworkId(MidnightSDKNetworkIds.Preview),
        ]),
      });
    };
    const first = await restore();
    const second = await restore();
    const addresses = (props: MidnightAccountProps) => {
      const keys = ledger.ZswapSecretKeys.fromSeed(
        Buffer.from(props.zswapKey.encryptedKey, 'hex'),
      );
      const dustKey = ledger.DustSecretKey.fromSeed(
        Buffer.from(props.dustKey.encryptedKey, 'hex'),
      );
      try {
        return {
          shielded: ShieldedAddress.codec
            .encode(
              props.networkId,
              new ShieldedAddress(
                ShieldedCoinPublicKey.fromHexString(keys.coinPublicKey),
                ShieldedEncryptionPublicKey.fromHexString(
                  keys.encryptionPublicKey,
                ),
              ),
            )
            .asString(),
          unshielded: createKeystore(
            Buffer.from(props.nightExternalKey.encryptedKey, 'hex'),
            props.networkId,
          )
            .getBech32Address()
            .asString(),
          dust: DustAddress.encodePublicKey(props.networkId, dustKey.publicKey),
        };
      } finally {
        keys.clear();
        dustKey.clear();
      }
    };
    const at = (entity: typeof first, index: number) =>
      entity.accounts.find(a => {
        const props = a.blockchainSpecific as MidnightAccountProps;
        return (
          props.accountIndex === index &&
          props.networkId === MidnightSDKNetworkIds.Preview
        );
      })!.blockchainSpecific as MidnightAccountProps;
    for (const index of [0, 7]) {
      expect(at(first, index)).toEqual(at(second, index));
      expect(addresses(at(first, index))).toEqual(addresses(at(second, index)));
    }
    expect(addresses(at(first, 0))).not.toEqual(addresses(at(first, 7)));
    expect(wallet.getState().wallets?.ids).toEqual([]);
  });

  it('derives Midnight from the recovery phrase of an entity created before Midnight loaded', async () => {
    const wallet = await createMidnightWallet();
    const entity = await createInMemoryWalletEntity(wallet, {
      mnemonicWords: stubData.mnemonic.split(' '),
      password,
      walletName: 'restore',
    });
    const { Midnight: _, ...withoutMidnight } = entity.blockchainSpecific;
    const beforeMidnight = {
      ...entity,
      accounts: entity.accounts.filter(a => a.blockchainName !== 'Midnight'),
      blockchainSpecific: withoutMidnight,
    };

    const extended = await createMidnightAccounts(wallet, {
      wallet: beforeMidnight,
      password,
      accountIndex: 1,
      targetNetworks: new Set([
        MidnightNetworkId(MidnightSDKNetworkIds.Preview),
      ]),
    });

    expect(extended.accounts.map(a => a.accountId)).toContain(
      MidnightAccountId(entity.walletId, 1, MidnightSDKNetworkIds.Preview),
    );
    expect(extended.blockchainSpecific.Midnight?.encryptedSeed).toMatch(
      /^[\da-f]+$/,
    );
    await expect(
      createMidnightAccounts(wallet, {
        wallet: { ...beforeMidnight, encryptedRecoveryPhrase: undefined },
        password,
        accountIndex: 1,
      }),
    ).rejects.toThrow('no Midnight seed and no recovery phrase');
  });

  it('rejects invalid indexes, duplicate accounts, unavailable integration and decryption failure', async () => {
    const wallet = await createMidnightWallet();
    const entity = await createInMemoryWalletEntity(wallet, {
      mnemonicWords: stubData.mnemonic.split(' '),
      password,
      walletName: 'restore',
    });
    for (const accountIndex of [-1, 1.5, NaN, Infinity, 2 ** 31]) {
      await expect(
        createMidnightAccounts(wallet, {
          wallet: entity,
          password,
          accountIndex,
        }),
      ).rejects.toThrow('account index');
    }
    await expect(
      createMidnightAccounts(wallet, {
        wallet: entity,
        password,
        accountIndex: 0,
      }),
    ).rejects.toThrow('already exists');
    const cardanoAccount = {
      ...entity.accounts[0],
      blockchainName: 'Cardano' as const,
      accountId: AccountId('existing-cardano-account'),
    };
    const mixed = { ...entity, accounts: [...entity.accounts, cardanoAccount] };
    const extended = await createMidnightAccounts(wallet, {
      wallet: mixed,
      password,
      accountIndex: 2,
      targetNetworks: new Set([
        MidnightNetworkId(MidnightSDKNetworkIds.Preview),
      ]),
    });
    expect(extended.accounts.find(a => a.blockchainName === 'Cardano')).toBe(
      cardanoAccount,
    );
    expect(extended.blockchainSpecific).toEqual(mixed.blockchainSpecific);
    const unavailable = await createLaceWallet({
      modules: [m.featureDev, m.storageInMemory] as const,
      environment: 'development',
      featureFlags: [],
      config: {},
    });
    await expect(
      createMidnightAccounts(unavailable, {
        wallet: entity,
        password,
        accountIndex: 1,
      }),
    ).rejects.toThrow('integration is not loaded');
    vi.mocked(SecretBox.open).mockRejectedValueOnce(
      new Error('decryption failed'),
    );
    await expect(
      createMidnightAccounts(wallet, {
        wallet: entity,
        password,
        accountIndex: 1,
      }),
    ).rejects.toThrow('decryption failed');
    await expect(
      createInMemoryWalletEntity(wallet, {
        mnemonicWords: stubData.mnemonic.split(' '),
        walletName: 'lazy',
      }),
    ).rejects.toThrow('does not yet support lazy wallets');
  });
  it('starts on Preview through the public endpoints and a local prover', async () => {
    const wallet = await createMidnightWallet();
    await overridesApplied(wallet, publicApplied);
    const state = wallet.getState();

    expect(state.wallets?.ids).toEqual([]);
    expect(state.network?.blockchainNetworks.Midnight).toEqual({
      mainnet: MidnightNetworkId(MidnightSDKNetworkIds.MainNet),
      testnet: MidnightNetworkId(MidnightSDKNetworkIds.Preview),
    });
    expect(await currentNetwork(wallet)).toEqual({
      networkId: MidnightSDKNetworkIds.Preview,
      config: {
        nodeAddress: MIDNIGHT_PREVIEW_NODE_URL,
        indexerAddress: MIDNIGHT_PREVIEW_INDEXER_URL,
        proofServer: LOCAL_PROOF_SERVER,
      },
    });
    expect(state.midnightContext?.userNetworksConfigOverrides).toEqual({
      [MidnightSDKNetworkIds.Preview]: {
        nodeAddress: 'https://rpc.preview.midnight.network',
        indexerAddress:
          'https://indexer.preview.midnight.network/api/v4/graphql',
      },
      [MidnightSDKNetworkIds.PreProd]: {
        nodeAddress: 'https://rpc.preprod.midnight.network',
        indexerAddress:
          'https://indexer.preprod.midnight.network/api/v4/graphql',
      },
      [MidnightSDKNetworkIds.MainNet]: {
        nodeAddress: 'https://rpc.mainnet.midnight.network',
        indexerAddress:
          'https://indexer.mainnet.midnight.network/api/v4/graphql',
      },
      [MidnightSDKNetworkIds.QaNet]: {},
      [MidnightSDKNetworkIds.Undeployed]: {},
      [MidnightSDKNetworkIds.DevNet]: {},
      [MidnightSDKNetworkIds.TestNet]: {},
    });
    expect(
      state.midnightContext?.defaultNetworksConfig[MidnightSDKNetworkIds.QaNet],
    ).toEqual({
      ...MIDNIGHT_PUBLIC_ENDPOINTS[MidnightSDKNetworkIds.QaNet],
      proofServer: LOCAL_PROOF_SERVER,
    });
  });

  it('supports only the public networks once started', async () => {
    const wallet = await createMidnightWallet();
    await overridesApplied(wallet, publicApplied);

    expect(
      sorted(wallet.getState().midnightContext?.supportedNetworksIds),
    ).toEqual(sorted(publicNetworkIds));
  });

  it('applies the configured prover and endpoint overrides', async () => {
    const wallet = await createMidnightWallet({
      proofServerUrl: 'https://prover.example',
      networks: {
        [MidnightSDKNetworkIds.PreProd]: {
          nodeAddress: 'https://node.preprod',
        },
      },
    });
    await overridesApplied(wallet, publicApplied);
    const state = wallet.getState();

    // The engine proves through the current network's effective config.
    expect((await currentNetwork(wallet)).config.proofServer).toEqual(
      REMOTE_PROOF_SERVER,
    );
    for (const networkId of publicNetworkIds) {
      expect(
        state.midnightContext?.defaultNetworksConfig[networkId].proofServer,
      ).toEqual(REMOTE_PROOF_SERVER);
    }
    const overrides = state.midnightContext?.userNetworksConfigOverrides;
    expect(overrides?.[MidnightSDKNetworkIds.Preview]).toEqual({
      nodeAddress: MIDNIGHT_PREVIEW_NODE_URL,
      indexerAddress: MIDNIGHT_PREVIEW_INDEXER_URL,
    });
    expect(overrides?.[MidnightSDKNetworkIds.PreProd]).toEqual({
      nodeAddress: 'https://node.preprod',
      indexerAddress:
        MIDNIGHT_PUBLIC_ENDPOINTS[MidnightSDKNetworkIds.PreProd].indexerAddress,
    });
    expect(overrides?.[MidnightSDKNetworkIds.DevNet]).toEqual({});
  });

  it('starts on the testnet the consumer config names, with the loadout prover', async () => {
    const wallet = await createMidnightWallet(
      { proofServerUrl: 'https://prover.example' },
      { defaultMidnightTestnetNetworkId: MidnightSDKNetworkIds.PreProd },
    );
    await overridesApplied(wallet, publicApplied);

    expect(
      wallet.getState().network?.blockchainNetworks.Midnight?.testnet,
    ).toBe(MidnightNetworkId(MidnightSDKNetworkIds.PreProd));
    expect(await currentNetwork(wallet)).toEqual({
      networkId: MidnightSDKNetworkIds.PreProd,
      config: {
        ...MIDNIGHT_PUBLIC_ENDPOINTS[MidnightSDKNetworkIds.PreProd],
        proofServer: REMOTE_PROOF_SERVER,
      },
    });
  });

  it('proves with a user-selected available prover over the loadout default', async () => {
    const teeMode = TEMENOS_PROOF_SERVER_MODES[MidnightSDKNetworkIds.Preview];
    if (!teeMode) throw new Error('No Temenos mode on Preview');
    const wallet = await createMidnightWallet(
      { proofServerUrl: 'https://prover.example' },
      {
        flags: [
          ...featureFlags,
          { key: FEATURE_FLAG_MIDNIGHT_TEE_TEMENOS_PROOF_SERVER },
        ],
      },
    );
    await overridesApplied(wallet, publicApplied);
    const { config } = await currentNetwork(wallet);

    wallet.dispatch('midnightContext.setUserNetworkConfigOverride', {
      networkId: MidnightSDKNetworkIds.Preview,
      config: { ...config, proofServer: teeMode },
      featureFlagsOverrides: {},
    });

    expect((await currentNetwork(wallet)).config.proofServer).toEqual(teeMode);
    expect(
      wallet.getState().midnightContext?.defaultNetworksConfig[
        MidnightSDKNetworkIds.Preview
      ].proofServer,
    ).toEqual(REMOTE_PROOF_SERVER);
  });

  it('refuses a TEE proof server without attested routing', () => {
    const teeMode = TEMENOS_PROOF_SERVER_MODES[MidnightSDKNetworkIds.Preview];
    if (!teeMode) throw new Error('No Temenos mode on Preview');

    expect(() =>
      createMidnightModule({ password, proofServerUrl: teeMode.url }),
    ).toThrow(/Cannot attest/);
    expect(() =>
      createMidnightModule({
        password,
        networks: { [MidnightSDKNetworkIds.PreProd]: { proofServer: teeMode } },
      }),
    ).toThrow(/Cannot attest/);
  });

  it('keeps a network selected right after creation through startup', async () => {
    const wallet = await createMidnightWallet();
    // Before the startup registration lands: the consumer's choice must win.
    selectMidnightNetwork(wallet, MidnightSDKNetworkIds.PreProd);
    await overridesApplied(wallet, publicApplied);
    expect((await currentNetwork(wallet)).networkId).toBe(
      MidnightSDKNetworkIds.PreProd,
    );
    expect(
      wallet.getState().network?.blockchainNetworks.Midnight?.testnet,
    ).toBe(MidnightNetworkId(MidnightSDKNetworkIds.PreProd));
  });

  it('switches the active Midnight network', async () => {
    const wallet = await createMidnightWallet();
    await overridesApplied(wallet, publicApplied);

    selectMidnightNetwork(wallet, MidnightSDKNetworkIds.PreProd);
    expect(await currentNetwork(wallet)).toEqual({
      networkId: MidnightSDKNetworkIds.PreProd,
      config: {
        ...MIDNIGHT_PUBLIC_ENDPOINTS[MidnightSDKNetworkIds.PreProd],
        proofServer: LOCAL_PROOF_SERVER,
      },
    });
    expect(wallet.getState().network?.networkType).toBe('testnet');

    selectMidnightNetwork(wallet, MidnightSDKNetworkIds.MainNet);
    expect((await currentNetwork(wallet)).networkId).toBe(
      MidnightSDKNetworkIds.MainNet,
    );
    expect(
      wallet.getState().network?.blockchainNetworks.Midnight?.testnet,
    ).toBe(MidnightNetworkId(MidnightSDKNetworkIds.PreProd));
  });

  it('refuses a network without endpoints and keeps the active one', async () => {
    const wallet = await createMidnightWallet({
      networks: {
        [MidnightSDKNetworkIds.TestNet]: {
          nodeAddress: 'https://node.testnet',
        },
      },
    });
    await overridesApplied(wallet, publicApplied);

    expect(() => {
      selectMidnightNetwork(wallet, MidnightSDKNetworkIds.DevNet);
    }).toThrow(MidnightNetworkNotConfiguredError);
    expect(() => {
      selectMidnightNetwork(wallet, MidnightSDKNetworkIds.TestNet);
    }).toThrow(
      'Midnight network "testnet" has no endpoints in this loadout: pass networks.testnet with nodeAddress and indexerAddress to createMidnightModule',
    );
    expect((await currentNetwork(wallet)).networkId).toBe(
      MidnightSDKNetworkIds.Preview,
    );
  });

  it('accepts a network whose endpoints networks supplies', async () => {
    const wallet = await createMidnightWallet({
      networks: {
        [MidnightSDKNetworkIds.DevNet]: {
          nodeAddress: 'https://node.devnet',
          indexerAddress: 'https://indexer.devnet/api/v4/graphql',
        },
      },
    });
    await overridesApplied(wallet, nodeApplied(MidnightSDKNetworkIds.DevNet));
    expect(
      sorted(wallet.getState().midnightContext?.supportedNetworksIds),
    ).toEqual(sorted([...publicNetworkIds, MidnightSDKNetworkIds.DevNet]));

    selectMidnightNetwork(wallet, MidnightSDKNetworkIds.DevNet);
    expect(await currentNetwork(wallet)).toEqual({
      networkId: MidnightSDKNetworkIds.DevNet,
      config: {
        nodeAddress: 'https://node.devnet',
        indexerAddress: 'https://indexer.devnet/api/v4/graphql',
        proofServer: LOCAL_PROOF_SERVER,
      },
    });
  });

  it('does not load the engine without the Midnight flag', async () => {
    const wallet = await createLaceWallet({
      modules: [
        m.featureDev,
        m.storageInMemory,
        createMidnightModule({ password }),
      ] as const,
      environment: 'development',
      featureFlags: [],
      config: { defaultFeatureFlags: [], extraFeatureFlags: [] },
    });
    expect(wallet.getState().midnightContext).toBeUndefined();
    expect(
      wallet.getState().network?.blockchainNetworks.Midnight,
    ).toBeUndefined();
    expect(() => {
      selectMidnightNetwork(wallet, MidnightSDKNetworkIds.Preview);
    }).toThrow(MidnightNetworkNotConfiguredError);
  });
});

describe('Midnight SDK instance isolation', () => {
  it('owns a distinct stable engine registry when wallets reuse the same modules', async () => {
    const props = {
      modules: [
        m.featureDev,
        m.storageInMemory,
        createMidnightModule({ password }),
      ] as const,
      environment: 'development' as const,
      featureFlags,
      config: {
        defaultFeatureFlags: featureFlags,
        extraFeatureFlags: [],
        defaultMidnightTestnetNetworkId: MidnightSDKNetworkIds.Preview,
      },
    };
    const [first, second] = await Promise.all([
      createLaceWallet(props),
      createLaceWallet(props),
    ]);
    const registry = async (wallet: MidnightWallet) => {
      const registries = await wallet._loadModules('addons.loadMidnightEngine');
      expect(registries).toHaveLength(1);
      return registries[0];
    };
    expect(await registry(first)).toBeDefined();
    expect(await registry(first)).not.toBe(await registry(second));
    expect(await registry(first)).toBe(await registry(first));
    // Engine access is an addon, never a state selector.
    expect(
      Object.keys(first.stateObservables.midnightContext).filter(key =>
        /registry/i.test(key),
      ),
    ).toEqual([]);
  });
});

const withAccountState = (
  wallet: MidnightWallet,
  accounts = [stubData.midnightAccount],
) => ({
  ...wallet,
  stateObservables: {
    ...wallet.stateObservables,
    wallets: {
      ...wallet.stateObservables.wallets,
      selectAll$: of([{ ...stubData.midnightWallet, accounts }]),
    },
    network: {
      ...wallet.stateObservables.network,
      selectAllActiveNetworkIds$: of([
        stubData.midnightAccount.blockchainNetworkId,
      ]),
    },
  },
});

describe('Midnight engine resolution and teardown', () => {
  it('resolves two same-account engines independently and never falls back after registry removal', async () => {
    const a = withAccountState(await createMidnightWallet());
    const b = withAccountState(
      await createMidnightWallet({
        proofServerUrl: 'https://second-prover.example',
      }),
    );
    const accountId = stubData.midnightAccount.accountId;
    const makeEngine = (id: string) =>
      ({
        accountId,
        transactionHistory$: of([]),
        signData: vi.fn(() => of({ signature: id, verifyingKey: id })),
        stop: vi.fn(() => of(undefined)),
      } as unknown as Engine);
    const first = makeEngine('aa');
    const second = makeEngine('bb');
    // Registrations stand in for provider startup; no external service is contacted.
    // The addon serves the instance's registry subject, which the engine writes.
    const registry = async (wallet: Pick<MidnightWallet, '_loadModules'>) =>
      (
        await wallet._loadModules('addons.loadMidnightEngine')
      )[0] as BehaviorSubject<MidnightWalletsByAccountId>;
    const registryA = await registry(a);
    const registryB = await registry(b);
    registryA.next({ [accountId]: first });
    registryB.next({ [accountId]: second });
    try {
      expect(await midnightWalletFor(a, {})).toBe(first);
      expect(await midnightWalletFor(b, {})).toBe(second);
      const signed = await withMidnightWallet(a, {}, engine =>
        engine.signData(new Uint8Array()),
      );
      expect(signed.isOk() && signed.value).toEqual({
        signature: 'aa',
        verifyingKey: 'aa',
      });
      const dataSigner = async (wallet: Pick<MidnightWallet, '_loadModules'>) =>
        (await wallet._loadModules('addons.loadSignerFactory'))
          .find(factory => factory.canSign(stubData.midnightAccount))!
          .createDataSigner({ wallet: stubData.midnightWallet, accountId });
      const signerA = await dataSigner(a);
      const signerB = await dataSigner(b);
      expect(
        await firstValueFrom(signerA.signData({ data: new Uint8Array() })),
      ).toEqual({ signature: 'aa', verifyingKey: 'aa' });
      expect(
        await firstValueFrom(signerB.signData({ data: new Uint8Array() })),
      ).toEqual({ signature: 'bb', verifyingKey: 'bb' });
      registryA.next({});
      await expect(
        firstValueFrom(signerA.signData({ data: new Uint8Array() })),
      ).rejects.toThrow('Could not load midnight wallet');

      await expect(midnightWalletFor(a, { startTimeout: 1 })).rejects.toThrow(
        'did not start',
      );
      expect(await midnightWalletFor(b, {})).toBe(second);
      expect(second.stop).not.toHaveBeenCalled();
      const failure = new Error('provider failed');
      const failed = await withMidnightWallet(b, {}, () =>
        throwError(() => failure),
      );
      expect(failed.isErr() && failed.error).toBe(failure);
      const nonError = await withMidnightWallet(b, {}, () =>
        throwError(() => 'rejected'),
      );
      expect(nonError.isErr() && nonError.error.message).toBe('rejected');
    } finally {
      registryA.next({});
      registryB.next({});
    }
  });

  it('preserves missing and ambiguous account errors before engine lookup', async () => {
    const wallet = await createMidnightWallet();
    await expect(
      midnightWalletFor(withAccountState(wallet), {
        accountId: 'missing' as typeof stubData.midnightAccount.accountId,
      }),
    ).rejects.toThrow('not found on the active network');
    await expect(
      midnightWalletFor(withAccountState(wallet, []), {}),
    ).rejects.toThrow('No Midnight accounts');
    await expect(
      midnightWalletFor(
        withAccountState(wallet, [
          stubData.midnightAccount,
          stubData.midnightAccount,
        ]),
        {},
      ),
    ).rejects.toThrow('Multiple Midnight accounts');
  });
});

it('keys the engine registry by runtime for every app', () => {
  type Runtime = Parameters<typeof midnightWalletsForRuntime>[0];
  const extension = { app: 'lace-extension' } as Runtime;
  const otherExtension = { app: 'lace-extension' } as Runtime;
  const mobile = { app: 'lace-mobile' } as Runtime;
  expect(midnightWalletsForRuntime(extension)).toBe(
    midnightWalletsForRuntime(extension),
  );
  expect(midnightWalletsForRuntime(extension)).not.toBe(
    midnightWalletsForRuntime(otherExtension),
  );
  expect(midnightWalletsForRuntime(mobile)).not.toBe(
    midnightWalletsForRuntime(extension),
  );
});

describe('Midnight module password', () => {
  it('keeps its own copy of the password and lends a zeroed-after-use copy per access', async () => {
    const callerPassword = new TextEncoder().encode('caller-owned');
    const module = createMidnightModule({ password: callerPassword });
    // The caller may zero its buffer once the module exists.
    callerPassword.fill(0);
    const { default: init } = await module.store!.load();
    const { sideEffectDependencies } = await init(
      {
        runtime: {
          config: {
            defaultMidnightTestnetNetworkId: MidnightSDKNetworkIds.Preview,
          },
        },
      } as Parameters<typeof init>[0],
      { logger: console } as unknown as Parameters<typeof init>[1],
    );
    const accessAuthSecret = sideEffectDependencies!.accessAuthSecret!;
    const lent: Uint8Array[] = [];
    const seen: Uint8Array[] = [];
    for (let access = 0; access < 2; access++)
      await firstValueFrom(
        accessAuthSecret(secret => {
          lent.push(secret);
          seen.push(Uint8Array.from(secret));
          return of(true);
        }),
      );
    const expected = new TextEncoder().encode('caller-owned');
    expect(seen).toEqual([expected, expected]);
    expect(lent[0]).not.toBe(callerPassword);
    expect(lent[0]).not.toBe(lent[1]);
    expect(lent.every(secret => secret.every(byte => byte === 0))).toBe(true);
  });
});

describe('Midnight loadout startup configuration', () => {
  it('rejects a loadout whose config does not name the testnet a wallet starts on', async () => {
    await expect(
      createLaceWallet({
        modules: [
          m.featureDev,
          m.storageInMemory,
          createMidnightModule({ password }),
        ] as const,
        environment: 'development',
        featureFlags,
        config: { defaultFeatureFlags: featureFlags, extraFeatureFlags: [] },
      }),
    ).rejects.toThrow('config.defaultMidnightTestnetNetworkId');
  });

  it('refuses a network without endpoints as soon as the wallet is created', async () => {
    const wallet = await createMidnightWallet();

    expect(() => {
      selectMidnightNetwork(wallet, MidnightSDKNetworkIds.DevNet);
    }).toThrow(MidnightNetworkNotConfiguredError);
    expect(
      sorted(wallet.getState().midnightContext?.supportedNetworksIds),
    ).toEqual(sorted(publicNetworkIds));
    expect(
      wallet.getState().midnightContext?.defaultNetworksConfig[
        MidnightSDKNetworkIds.Preview
      ].proofServer,
    ).toEqual(LOCAL_PROOF_SERVER);
  });
});
