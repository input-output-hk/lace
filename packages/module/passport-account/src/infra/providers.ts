import {
  loadCircuitAssets,
  loadVerifierKey,
  UnknownCircuitError,
} from '../acc/artefact-loader';
import { accManifest } from '../acc/manifest';

import { createManifestKeyMaterialResolver } from './http-prover';
import { applyNetworkId } from './network-id';

import type { FetchBytes } from '../acc/artefact-loader';
import type { AccCircuitAssets } from '../acc/artefact-loader';
import type { AccProviders } from '../acc/deploy';
import type { RandomBytes } from '../acc/enc-keys';
import type { AccManifest, AccProvingCircuitName } from '../acc/manifest';
import type {
  FeeSponsor,
  PassportNetworkConfig,
  PassportProver,
} from '@lace-contract/passport';

/**
 * A flow stage a provider call makes observable: 'proving' when the proof
 * provider starts proving a transaction, 'sponsoring' when the wallet
 * provider hands it to the fee sponsor for balancing.
 */
export type MidnightProviderStage = 'proving' | 'sponsoring';

/** A ledger transaction as the providers pass it around: opaque bytes. */
type SerializableTx = { serialize: () => Uint8Array };

/**
 * The slice of a ledger unproven transaction the proof provider drives:
 * proving delegates to the ledger object itself, which calls back into
 * the given circuit-level proving provider.
 */
type ProvableTx = {
  prove: (
    provingProvider: unknown,
    costModel: unknown,
  ) => Promise<SerializableTx>;
};

/** A finalized ledger transaction, as the submission seam consumes it. */
type FinalizedTx = SerializableTx & { identifiers: () => string[] };

/**
 * The submission surface of the wallet-sdk node client. Structural, so
 * tests inject a mock and the default lazily builds the real client.
 */
export type SubmissionService = {
  submitTransaction: (
    tx: { serialize: () => Uint8Array },
    waitForStatus?: 'Finalized' | 'InBlock' | 'Submitted',
  ) => Promise<unknown>;
  close: () => Promise<void>;
};

const ZSWAP_SEED_LENGTH = 32;

const defaultRandomBytes: RandomBytes = length =>
  crypto.getRandomValues(new Uint8Array(length));

const defaultFetchBytes: FetchBytes = async url => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Artefact download failed: url="${url}", status="${response.status} ${response.statusText}"`,
    );
  }
  return new Uint8Array(await response.arrayBuffer());
};

export type CreateMidnightProvidersProps = {
  /** Endpoints of the Midnight network the account lives on. */
  network: PassportNetworkConfig;
  /** Prover the proof provider adapts; resolves its own key material. */
  prover: PassportProver;
  /** Fee sponsor the wallet provider delegates balancing to. */
  sponsor: FeeSponsor;
  /** Artefact download transport; defaults to the global fetch. */
  fetchBytes?: FetchBytes;
  /** Integrity pins for the ZK assets; defaults to the bundled manifest. */
  manifest?: AccManifest;
  /** Called when a provider call enters an observable flow stage. */
  onStage?: (stage: MidnightProviderStage) => void;
  /** Randomness for the ephemeral Zswap keys; defaults to Web Crypto. */
  randomBytes?: RandomBytes;
  /** Public data provider factory; defaults to midnight-js' indexer provider. */
  createPublicDataProvider?: () => Promise<unknown>;
  /** Submission service factory; defaults to the wallet-sdk node client. */
  createSubmissionService?: () => Promise<SubmissionService>;
};

/**
 * In-memory {@link AccProviders}.privateStateProvider. The account private
 * state only needs to outlive one deploy-and-activate flow, so nothing is
 * written to disk; contract-address scoping is a no-op because each flow
 * gets its own provider instance.
 */
const createInMemoryPrivateStateProvider = () => {
  const privateStates = new Map<string, unknown>();
  const signingKeys = new Map<string, unknown>();

  return {
    setContractAddress: (_address: string): void => undefined,
    set: async (privateStateId: string, state: unknown): Promise<void> => {
      privateStates.set(privateStateId, state);
    },
    get: async (privateStateId: string): Promise<unknown> =>
      privateStates.get(privateStateId) ?? null,
    remove: async (privateStateId: string): Promise<void> => {
      privateStates.delete(privateStateId);
    },
    clear: async (): Promise<void> => {
      privateStates.clear();
    },
    setSigningKey: async (address: string, key: unknown): Promise<void> => {
      signingKeys.set(address, key);
    },
    getSigningKey: async (address: string): Promise<unknown> =>
      signingKeys.get(address) ?? null,
    removeSigningKey: async (address: string): Promise<void> => {
      signingKeys.delete(address);
    },
    clearSigningKeys: async (): Promise<void> => {
      signingKeys.clear();
    },
  };
};

/**
 * Assembles the midnight-js providers {@link deployAccount} runs through,
 * swapping the platform seams in where the stock providers would expect a
 * full wallet:
 *
 * - zkConfigProvider downloads ZK assets through {@link loadCircuitAssets},
 *   so every byte is verified against the manifest's sha256 pins. Circuits
 *   the manifest does not pin (the never-installed k256 arm and the
 *   permissionless deposits) are skipped when verifier keys are listed.
 * - proofProvider adapts the {@link PassportProver} to the ledger's
 *   circuit-level proving interface.
 * - walletProvider delegates balancing to the {@link FeeSponsor}; the user
 *   holds no tokens, so the sponsor covers every fee. Its Zswap keys are
 *   ephemeral, generated per flow: the transactions move no coins, the
 *   keys only satisfy transaction construction and are discarded with the
 *   providers.
 * - midnightProvider submits each finalized transaction over the node RPC
 *   relay, opening and closing a connection per submission.
 *
 * `onStage` reports the proving and sponsoring stages as they start, so
 * the caller can surface flow progress that otherwise happens inside
 * midnight-js calls.
 */
export const createMidnightProviders = async ({
  network,
  prover,
  sponsor,
  fetchBytes = defaultFetchBytes,
  manifest = accManifest,
  onStage,
  randomBytes = defaultRandomBytes,
  createPublicDataProvider,
  createSubmissionService,
}: CreateMidnightProvidersProps): Promise<AccProviders> => {
  await applyNetworkId(network.networkId);
  const ledger = await import('@midnightntwrk/ledger-v9');

  const zswapKeys = ledger.ZswapSecretKeys.fromSeed(
    randomBytes(ZSWAP_SEED_LENGTH),
  );
  const coinPublicKey = zswapKeys.coinPublicKey;
  const encryptionPublicKey = zswapKeys.encryptionPublicKey;
  zswapKeys.clear();

  const assetCache = new Map<
    AccProvingCircuitName,
    Promise<AccCircuitAssets>
  >();
  const circuitAssets = async (
    circuit: AccProvingCircuitName,
  ): Promise<AccCircuitAssets> => {
    let assets = assetCache.get(circuit);
    if (!assets) {
      assets = loadCircuitAssets({
        artefactUrl: network.artefactUrl,
        circuit,
        fetchBytes,
        manifest,
      });
      assetCache.set(circuit, assets);
    }
    return assets;
  };
  const isPinnedCircuit = (
    circuitId: string,
  ): circuitId is AccProvingCircuitName => circuitId in manifest.circuits;

  const verifierKeyCache = new Map<string, Promise<Uint8Array>>();
  const verifierKey = async (circuitId: string): Promise<Uint8Array> => {
    if (isPinnedCircuit(circuitId)) {
      return (await circuitAssets(circuitId)).verifierKey;
    }
    let key = verifierKeyCache.get(circuitId);
    if (!key) {
      key = (async () => {
        const { expectedVk } = await import('../acc/acc-module');
        const expectedSha256 = expectedVk[circuitId];
        if (!expectedSha256) throw new UnknownCircuitError(circuitId);
        return loadVerifierKey({
          artefactUrl: network.artefactUrl,
          circuit: circuitId,
          fetchBytes,
          expectedSha256,
        });
      })();
      verifierKeyCache.set(circuitId, key);
    }
    return key;
  };

  const zkConfigProvider = {
    getZKIR: async (circuitId: AccProvingCircuitName) =>
      (await circuitAssets(circuitId)).zkir,
    getProverKey: async (circuitId: AccProvingCircuitName) =>
      (await circuitAssets(circuitId)).proverKey,
    getVerifierKey: async (circuitId: string) => verifierKey(circuitId),
    getVerifierKeys: async (circuitIds: string[]) =>
      Promise.all(
        circuitIds
          .filter(circuitId => isPinnedCircuit(circuitId))
          .map(
            async circuitId =>
              [
                circuitId,
                (await circuitAssets(circuitId)).verifierKey,
              ] as const,
          ),
      ),
    get: async (circuitId: AccProvingCircuitName) => ({
      circuitId,
      ...(await circuitAssets(circuitId)),
    }),
  };

  const resolveKeyMaterial = createManifestKeyMaterialResolver({
    artefactUrl: network.artefactUrl,
    fetchBytes,
    manifest,
  });
  const provingProvider = {
    prove: async (
      preimage: Uint8Array,
      keyLocation: string,
      overwriteBindingInput?: bigint,
    ) => prover.prove(preimage, keyLocation, overwriteBindingInput),
    check: async (preimage: Uint8Array, keyLocation: string) =>
      ledger.parseCheckResult(await prover.check(preimage, keyLocation)),
    lookupKey: async (keyLocation: string) => resolveKeyMaterial(keyLocation),
  };
  const proofProvider = {
    proveTx: async (unprovenTx: ProvableTx) => {
      onStage?.('proving');
      return unprovenTx.prove(
        provingProvider,
        ledger.CostModel.initialCostModel(),
      );
    },
  };

  const walletProvider = {
    getCoinPublicKey: () => coinPublicKey,
    getEncryptionPublicKey: () => encryptionPublicKey,
    balanceTx: async (tx: SerializableTx) => {
      onStage?.('sponsoring');
      const balanced = await sponsor.balanceAndSign(tx.serialize());
      return ledger.Transaction.deserialize(
        'signature',
        'proof',
        'binding',
        balanced,
      );
    },
  };

  const defaultSubmissionService = async (): Promise<SubmissionService> => {
    const { createNodeRelaySubmissionService } = await import('./node-relay');
    return createNodeRelaySubmissionService(network.nodeUrl);
  };
  const midnightProvider = {
    submitTx: async (tx: FinalizedTx) => {
      const service = await (
        createSubmissionService ?? defaultSubmissionService
      )();
      try {
        await service.submitTransaction(tx, 'InBlock');
        return tx.identifiers().at(-1);
      } finally {
        await service.close();
      }
    },
  };

  const defaultPublicDataProvider = async (): Promise<unknown> => {
    const { indexerPublicDataProvider } = await import(
      '@midnight-ntwrk/midnight-js-indexer-public-data-provider'
    );
    return indexerPublicDataProvider({
      queryURL: network.indexerUrl,
      subscriptionURL: network.indexerWsUrl,
    });
  };
  const publicDataProvider = await (
    createPublicDataProvider ?? defaultPublicDataProvider
  )();

  return {
    publicDataProvider,
    zkConfigProvider,
    proofProvider,
    privateStateProvider: createInMemoryPrivateStateProvider(),
    walletProvider,
    midnightProvider,
  };
};
