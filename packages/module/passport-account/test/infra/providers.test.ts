import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UnknownCircuitError } from '../../src/acc/artefact-loader';
import { createMidnightProviders } from '../../src/infra/providers';

import type * as ArtefactLoader from '../../src/acc/artefact-loader';
import type { MidnightProviderStage } from '../../src/infra/providers';
import type { FeeSponsor, PassportProver } from '@lace-contract/passport';

const ledgerMocks = vi.hoisted(() => {
  const clear = vi.fn();
  return {
    clear,
    ZswapSecretKeys: {
      fromSeed: vi.fn(() => ({
        coinPublicKey: 'coin-public-key',
        encryptionPublicKey: 'encryption-public-key',
        clear,
      })),
    },
    CostModel: { initialCostModel: vi.fn(() => 'initial-cost-model') },
    parseCheckResult: vi.fn(() => [1n, undefined]),
    Transaction: {
      deserialize: vi.fn((...args: unknown[]) => ({ deserialized: args })),
    },
  };
});

const submissionMocks = vi.hoisted(() => {
  const service = {
    submitTransaction: vi.fn(async () => ({ txHash: 'extrinsic-hash' })),
    close: vi.fn(async () => undefined),
  };
  return {
    service,
    createNodeRelaySubmissionService: vi.fn(async () => service),
  };
});

const indexerMocks = vi.hoisted(() => ({
  indexerPublicDataProvider: vi.fn(() => 'indexer-public-data-provider'),
}));

const artefactMocks = vi.hoisted(() => ({
  loadCircuitAssets: vi.fn(async ({ circuit }: { circuit: string }) => ({
    zkir: `zkir-${circuit}`,
    proverKey: `prover-key-${circuit}`,
    verifierKey: `verifier-key-${circuit}`,
  })),
  loadVerifierKey: vi.fn(async ({ circuit }: { circuit: string }) =>
    Uint8Array.from([...`verifier-key-${circuit}`].map(c => c.charCodeAt(0))),
  ),
}));

const accModuleMocks = vi.hoisted(() => ({
  expectedVk: { deposit_unshielded: 'deposit-unshielded-vk-sha256' } as Record<
    string,
    string
  >,
}));

const networkIdMocks = vi.hoisted(() => ({
  setNetworkId: vi.fn(),
}));

vi.mock('@midnight-ntwrk/midnight-js-network-id', () => ({
  setNetworkId: networkIdMocks.setNetworkId,
}));
vi.mock('@midnightntwrk/ledger-v9', () => ledgerMocks);
vi.mock('../../src/infra/node-relay', () => ({
  createNodeRelaySubmissionService:
    submissionMocks.createNodeRelaySubmissionService,
}));
vi.mock('@midnight-ntwrk/midnight-js-indexer-public-data-provider', () => ({
  indexerPublicDataProvider: indexerMocks.indexerPublicDataProvider,
}));
vi.mock('../../src/acc/artefact-loader', async importOriginal => ({
  ...(await importOriginal<typeof ArtefactLoader>()),
  loadCircuitAssets: artefactMocks.loadCircuitAssets,
  loadVerifierKey: artefactMocks.loadVerifierKey,
}));
vi.mock('../../src/acc/acc-module', () => ({
  expectedVk: accModuleMocks.expectedVk,
}));

type ZkConfigProvider = {
  getZKIR: (circuitId: string) => Promise<unknown>;
  getProverKey: (circuitId: string) => Promise<unknown>;
  getVerifierKey: (circuitId: string) => Promise<unknown>;
  getVerifierKeys: (
    circuitIds: string[],
  ) => Promise<(readonly [string, unknown])[]>;
  get: (circuitId: string) => Promise<Record<string, unknown>>;
};

type ProvingProvider = {
  prove: (
    preimage: Uint8Array,
    keyLocation: string,
    overwriteBindingInput?: bigint,
  ) => Promise<Uint8Array>;
  check: (
    preimage: Uint8Array,
    keyLocation: string,
  ) => Promise<(bigint | undefined)[]>;
  lookupKey: (keyLocation: string) => Promise<unknown>;
};

type ProofProvider = {
  proveTx: (unprovenTx: {
    prove: (provingProvider: unknown, costModel: unknown) => Promise<unknown>;
  }) => Promise<unknown>;
};

type WalletProvider = {
  getCoinPublicKey: () => string;
  getEncryptionPublicKey: () => string;
  balanceTx: (tx: { serialize: () => Uint8Array }) => Promise<unknown>;
};

type MidnightProvider = {
  submitTx: (tx: {
    serialize: () => Uint8Array;
    identifiers: () => string[];
  }) => Promise<unknown>;
};

type PrivateStateProvider = {
  setContractAddress: (address: string) => void;
  set: (privateStateId: string, state: unknown) => Promise<void>;
  get: (privateStateId: string) => Promise<unknown>;
  remove: (privateStateId: string) => Promise<void>;
  clear: () => Promise<void>;
  setSigningKey: (address: string, key: unknown) => Promise<void>;
  getSigningKey: (address: string) => Promise<unknown>;
  removeSigningKey: (address: string) => Promise<void>;
  clearSigningKeys: () => Promise<void>;
};

const network = {
  networkId: 'undeployed',
  indexerUrl: 'http://indexer.example.com/api/v3/graphql',
  indexerWsUrl: 'ws://indexer.example.com/api/v3/graphql/ws',
  nodeUrl: 'http://node.example.com',
  artefactUrl: 'http://artefacts.example.com/account',
};

const prover = {
  prove: vi.fn(async () => new Uint8Array([7])),
  check: vi.fn(async () => new Uint8Array([8])),
} as unknown as PassportProver;

const sponsor = {
  balanceAndSign: vi.fn(async () => new Uint8Array([9])),
} as unknown as FeeSponsor;

const onStage = vi.fn<(stage: MidnightProviderStage) => void>();

const createProviders = async (
  overrides: Partial<Parameters<typeof createMidnightProviders>[0]> = {},
) =>
  createMidnightProviders({
    network,
    prover,
    sponsor,
    fetchBytes: vi.fn(),
    randomBytes: length => new Uint8Array(length).fill(5),
    onStage,
    createPublicDataProvider: async () => 'injected-public-data',
    createSubmissionService: async () => submissionMocks.service,
    ...overrides,
  });

describe('createMidnightProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies the configured network id before any provider work', async () => {
    await createProviders();

    expect(networkIdMocks.setNetworkId).toHaveBeenCalledExactlyOnceWith(
      network.networkId,
    );
    expect(
      networkIdMocks.setNetworkId.mock.invocationCallOrder[0],
    ).toBeLessThan(
      ledgerMocks.ZswapSecretKeys.fromSeed.mock.invocationCallOrder[0],
    );
  });

  it('derives ephemeral zswap keys from the injected randomness and clears the secrets', async () => {
    const providers = await createProviders();
    const walletProvider = providers.walletProvider as WalletProvider;

    expect(
      ledgerMocks.ZswapSecretKeys.fromSeed,
    ).toHaveBeenCalledExactlyOnceWith(new Uint8Array(32).fill(5));
    expect(walletProvider.getCoinPublicKey()).toBe('coin-public-key');
    expect(walletProvider.getEncryptionPublicKey()).toBe(
      'encryption-public-key',
    );
    expect(ledgerMocks.clear).toHaveBeenCalledOnce();
  });

  describe('zkConfigProvider', () => {
    it('serves manifest-pinned assets and caches one download per circuit', async () => {
      const providers = await createProviders();
      const zkConfigProvider = providers.zkConfigProvider as ZkConfigProvider;

      await expect(
        zkConfigProvider.getZKIR('add_device_with_jubjub'),
      ).resolves.toBe('zkir-add_device_with_jubjub');
      await expect(
        zkConfigProvider.getProverKey('add_device_with_jubjub'),
      ).resolves.toBe('prover-key-add_device_with_jubjub');
      await expect(
        zkConfigProvider.getVerifierKey('add_device_with_jubjub'),
      ).resolves.toBe('verifier-key-add_device_with_jubjub');

      expect(artefactMocks.loadCircuitAssets).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          artefactUrl: network.artefactUrl,
          circuit: 'add_device_with_jubjub',
        }),
      );
    });

    it('returns the full ZK config of one circuit', async () => {
      const providers = await createProviders();
      const zkConfigProvider = providers.zkConfigProvider as ZkConfigProvider;

      await expect(
        zkConfigProvider.get('remove_device_with_jubjub'),
      ).resolves.toEqual({
        circuitId: 'remove_device_with_jubjub',
        zkir: 'zkir-remove_device_with_jubjub',
        proverKey: 'prover-key-remove_device_with_jubjub',
        verifierKey: 'verifier-key-remove_device_with_jubjub',
      });
    });

    it('downloads a pinned non-proving verifier key once and serves it from cache', async () => {
      const providers = await createProviders();
      const zkConfigProvider = providers.zkConfigProvider as ZkConfigProvider;

      const verifierKey = await zkConfigProvider.getVerifierKey(
        'deposit_unshielded',
      );

      await expect(
        zkConfigProvider.getVerifierKey('deposit_unshielded'),
      ).resolves.toBe(verifierKey);
      expect(artefactMocks.loadVerifierKey).toHaveBeenCalledExactlyOnceWith({
        artefactUrl: network.artefactUrl,
        circuit: 'deposit_unshielded',
        fetchBytes: expect.any(Function) as unknown,
        expectedSha256: 'deposit-unshielded-vk-sha256',
      });
      expect(artefactMocks.loadCircuitAssets).not.toHaveBeenCalled();
    });

    it('rejects a verifier key request for a circuit without a vk pin', async () => {
      const providers = await createProviders();
      const zkConfigProvider = providers.zkConfigProvider as ZkConfigProvider;

      const failure = zkConfigProvider.getVerifierKey('transfer_everything');

      await expect(failure).rejects.toThrow(UnknownCircuitError);
      await expect(failure).rejects.toThrow(
        'Unknown Account Custody Contract circuit: transfer_everything',
      );
      expect(artefactMocks.loadVerifierKey).not.toHaveBeenCalled();
    });

    it('lists verifier keys only for circuits the manifest pins', async () => {
      const providers = await createProviders();
      const zkConfigProvider = providers.zkConfigProvider as ZkConfigProvider;

      const verifierKeys = await zkConfigProvider.getVerifierKeys([
        'activate_initial_device_with_jubjub',
        'deposit_unshielded',
        'withdraw_unshielded_with_k256',
      ]);

      expect(verifierKeys).toEqual([
        [
          'activate_initial_device_with_jubjub',
          'verifier-key-activate_initial_device_with_jubjub',
        ],
      ]);
      expect(artefactMocks.loadCircuitAssets).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          circuit: 'activate_initial_device_with_jubjub',
        }),
      );
    });
  });

  describe('proofProvider', () => {
    it('reports the proving stage and proves through the passport prover, forwarding the binding input overwrite', async () => {
      const providers = await createProviders();
      const proofProvider = providers.proofProvider as ProofProvider;
      const prove = vi.fn(async () => 'proved-tx');

      await expect(proofProvider.proveTx({ prove })).resolves.toBe('proved-tx');

      expect(onStage).toHaveBeenCalledExactlyOnceWith('proving');
      expect(prove).toHaveBeenCalledExactlyOnceWith(
        expect.any(Object),
        'initial-cost-model',
      );

      const [provingProvider] = prove.mock.calls[0] as unknown as [
        ProvingProvider,
      ];
      const preimage = new Uint8Array([3]);

      await expect(
        provingProvider.prove(preimage, 'keys/add_device_with_jubjub', 42n),
      ).resolves.toEqual(new Uint8Array([7]));
      expect(prover.prove).toHaveBeenCalledExactlyOnceWith(
        preimage,
        'keys/add_device_with_jubjub',
        42n,
      );

      await expect(
        provingProvider.check(preimage, 'keys/add_device_with_jubjub'),
      ).resolves.toEqual([1n, undefined]);
      expect(prover.check).toHaveBeenCalledExactlyOnceWith(
        preimage,
        'keys/add_device_with_jubjub',
      );
      expect(ledgerMocks.parseCheckResult).toHaveBeenCalledExactlyOnceWith(
        new Uint8Array([8]),
      );
    });

    it('looks key material up through the manifest and resolves unknown locations to undefined', async () => {
      const providers = await createProviders();
      const proofProvider = providers.proofProvider as ProofProvider;
      const prove = vi.fn(async () => 'proved-tx');
      await proofProvider.proveTx({ prove });
      const [provingProvider] = prove.mock.calls[0] as unknown as [
        ProvingProvider,
      ];

      await expect(
        provingProvider.lookupKey('keys/add_device_with_jubjub'),
      ).resolves.toEqual({
        proverKey: 'prover-key-add_device_with_jubjub',
        verifierKey: 'verifier-key-add_device_with_jubjub',
        ir: 'zkir-add_device_with_jubjub',
      });
      await expect(
        provingProvider.lookupKey('midnight/zswap/spend'),
      ).resolves.toBeUndefined();
    });
  });

  describe('walletProvider', () => {
    it('reports the sponsoring stage and balances through the fee sponsor', async () => {
      const providers = await createProviders();
      const walletProvider = providers.walletProvider as WalletProvider;
      const serialized = new Uint8Array([4]);

      const balanced = await walletProvider.balanceTx({
        serialize: () => serialized,
      });

      expect(onStage).toHaveBeenCalledExactlyOnceWith('sponsoring');
      expect(sponsor.balanceAndSign).toHaveBeenCalledExactlyOnceWith(
        serialized,
      );
      expect(
        ledgerMocks.Transaction.deserialize,
      ).toHaveBeenCalledExactlyOnceWith(
        'signature',
        'proof',
        'binding',
        new Uint8Array([9]),
      );
      expect(balanced).toEqual({
        deserialized: ['signature', 'proof', 'binding', new Uint8Array([9])],
      });
    });
  });

  describe('midnightProvider', () => {
    const finalizedTx = {
      serialize: () => new Uint8Array([6]),
      identifiers: () => ['first-id', 'last-id'],
    };

    it('submits the finalized transaction, waits for InBlock, and returns its identifier', async () => {
      const providers = await createProviders();
      const midnightProvider = providers.midnightProvider as MidnightProvider;

      await expect(midnightProvider.submitTx(finalizedTx)).resolves.toBe(
        'last-id',
      );
      expect(
        submissionMocks.service.submitTransaction,
      ).toHaveBeenCalledExactlyOnceWith(finalizedTx, 'InBlock');
      expect(submissionMocks.service.close).toHaveBeenCalledOnce();
    });

    it('closes the submission service when submission fails', async () => {
      const providers = await createProviders();
      const midnightProvider = providers.midnightProvider as MidnightProvider;
      submissionMocks.service.submitTransaction.mockRejectedValueOnce(
        new Error('relay unreachable'),
      );

      await expect(midnightProvider.submitTx(finalizedTx)).rejects.toThrow(
        'relay unreachable',
      );
      expect(submissionMocks.service.close).toHaveBeenCalledOnce();
    });

    it('builds the default submission service over the node extrinsic relay', async () => {
      const providers = await createProviders({
        createSubmissionService: undefined,
      });
      const midnightProvider = providers.midnightProvider as MidnightProvider;

      await midnightProvider.submitTx(finalizedTx);

      expect(
        submissionMocks.createNodeRelaySubmissionService,
      ).toHaveBeenCalledExactlyOnceWith(network.nodeUrl);
    });
  });

  describe('privateStateProvider', () => {
    it('stores private states and signing keys in memory', async () => {
      const providers = await createProviders();
      const privateStateProvider =
        providers.privateStateProvider as PrivateStateProvider;

      privateStateProvider.setContractAddress('some-address');

      await expect(privateStateProvider.get('state-id')).resolves.toBeNull();
      await privateStateProvider.set('state-id', { coins: {} });
      await expect(privateStateProvider.get('state-id')).resolves.toEqual({
        coins: {},
      });
      await privateStateProvider.remove('state-id');
      await expect(privateStateProvider.get('state-id')).resolves.toBeNull();

      await expect(
        privateStateProvider.getSigningKey('address'),
      ).resolves.toBeNull();
      await privateStateProvider.setSigningKey('address', 'signing-key');
      await expect(privateStateProvider.getSigningKey('address')).resolves.toBe(
        'signing-key',
      );
      await privateStateProvider.removeSigningKey('address');
      await expect(
        privateStateProvider.getSigningKey('address'),
      ).resolves.toBeNull();
      await privateStateProvider.setSigningKey('address', 'signing-key');
      await privateStateProvider.clearSigningKeys();
      await expect(
        privateStateProvider.getSigningKey('address'),
      ).resolves.toBeNull();

      await privateStateProvider.set('other-id', 'state');
      await privateStateProvider.clear();
      await expect(privateStateProvider.get('other-id')).resolves.toBeNull();
    });
  });

  describe('publicDataProvider', () => {
    it('uses the injected public data provider factory', async () => {
      const providers = await createProviders();

      expect(providers.publicDataProvider).toBe('injected-public-data');
      expect(indexerMocks.indexerPublicDataProvider).not.toHaveBeenCalled();
    });

    it('defaults to the midnight-js indexer provider over the network endpoints', async () => {
      const providers = await createProviders({
        createPublicDataProvider: undefined,
      });

      expect(providers.publicDataProvider).toBe('indexer-public-data-provider');
      expect(
        indexerMocks.indexerPublicDataProvider,
      ).toHaveBeenCalledExactlyOnceWith({
        queryURL: network.indexerUrl,
        subscriptionURL: network.indexerWsUrl,
      });
    });
  });
});
