import { AuthSecret } from '@lace-contract/authentication-prompt';
import {
  MidnightSDKNetworkId,
  MidnightSDKNetworkIds,
} from '@lace-contract/midnight-context';
import { ByteArray } from '@lace-lib/util';
import { assertProofServerRouting } from '@lace-lib/vendor/midnight-proof-servers';
import { createMidnightSyncModule } from '@lace-module/midnight-sync/sdk';
import { finalize, of, tap } from 'rxjs';

import type {
  MidnightNetworkConfig,
  ProofServerMode,
} from '@lace-contract/midnight-context';
import type {
  CreateAttestedProver,
  MidnightNetworkConfigOverrides,
  MidnightSyncAuth,
  MidnightSyncBatchUpdates,
} from '@lace-module/midnight-sync/sdk';

/** The public node and indexer of a Midnight network. */
export type MidnightPublicEndpoints = Pick<
  MidnightNetworkConfig,
  'indexerAddress' | 'nodeAddress'
>;

/** The networks with public endpoints, which the SDK syncs through without `networks`. */
export type MidnightPublicNetworkId =
  | MidnightSDKNetworkIds['MainNet']
  | MidnightSDKNetworkIds['PreProd']
  | MidnightSDKNetworkIds['Preview']
  | MidnightSDKNetworkIds['QaNet'];

const publicEndpoints = (
  networkId: MidnightPublicNetworkId,
): MidnightPublicEndpoints => ({
  nodeAddress: `https://rpc.${networkId}.midnight.network`,
  indexerAddress: `https://indexer.${networkId}.midnight.network/api/v4/graphql`,
});

/**
 * The public Midnight endpoints the SDK syncs through by default. Every other
 * network needs its endpoints from `networks` before `selectMidnightNetwork`
 * accepts it.
 */
export const MIDNIGHT_PUBLIC_ENDPOINTS: Record<
  MidnightPublicNetworkId,
  MidnightPublicEndpoints
> = {
  [MidnightSDKNetworkIds.MainNet]: publicEndpoints(
    MidnightSDKNetworkIds.MainNet,
  ),
  [MidnightSDKNetworkIds.PreProd]: publicEndpoints(
    MidnightSDKNetworkIds.PreProd,
  ),
  [MidnightSDKNetworkIds.Preview]: publicEndpoints(
    MidnightSDKNetworkIds.Preview,
  ),
  [MidnightSDKNetworkIds.QaNet]: publicEndpoints(MidnightSDKNetworkIds.QaNet),
};
/** The public node of Midnight Preview. */
export const MIDNIGHT_PREVIEW_NODE_URL =
  MIDNIGHT_PUBLIC_ENDPOINTS[MidnightSDKNetworkIds.Preview].nodeAddress;
/** The public indexer of Midnight Preview. */
export const MIDNIGHT_PREVIEW_INDEXER_URL =
  MIDNIGHT_PUBLIC_ENDPOINTS[MidnightSDKNetworkIds.Preview].indexerAddress;
/** A proof server on the consumer's own machine, the default prover. */
export const MIDNIGHT_LOCAL_PROOF_SERVER_URL = 'http://localhost:6300';

const isPublicNetworkId = (
  networkId: MidnightSDKNetworkId,
): networkId is MidnightPublicNetworkId =>
  networkId in MIDNIGHT_PUBLIC_ENDPOINTS;

/** The options of `createMidnightModule`. */
export type CreateMidnightModuleProps = {
  /**
   * Seals the derived account keys inside the wallet entity, and unlocks
   * them for sync and signing. Pass the same bytes to the entity helpers.
   * With a passkey, any per-session secret the application keeps in memory.
   * The module copies the bytes when it is created and keeps its copy while it
   * is referenced. Zero your own buffer only after the last entity helper call
   * that takes the same bytes (`createInMemoryWalletEntity`,
   * `createMidnightAccounts`, `createMidnightPasskeyWalletEntity`), never right
   * after `createMidnightModule`: an entity sealed under zeroed bytes cannot be
   * unlocked with the module's copy.
   */
  password: Uint8Array;
  /**
   * The proof server every network proves with; {@link MIDNIGHT_LOCAL_PROOF_SERVER_URL}
   * by default. TEE endpoints require an explicit `tee-delegated` network mode
   * and `createAttestedProver`.
   */
  proofServerUrl?: string;
  /** Endpoint overrides per network, over {@link MIDNIGHT_PUBLIC_ENDPOINTS}. */
  networks?: MidnightNetworkConfigOverrides;
  batchUpdates?: MidnightSyncBatchUpdates;
  /** Trusted host adapter; must accept evidence and bind a channel before returning a session. */
  createAttestedProver?: CreateAttestedProver;
};

// Each access lends a further copy, zeroed after use. Modules have no teardown
// hook, so nothing zeroes the owned copy.
const passwordAuth = (password: Uint8Array): MidnightSyncAuth => {
  const owned = ByteArray.clone(ByteArray(password));
  return {
    authenticate: () => of(true),
    accessAuthSecret: callback => {
      const clone = AuthSecret(ByteArray.clone(owned));
      return callback(clone).pipe(
        tap(() => clone.fill(0)),
        finalize(() => clone.fill(0)),
      );
    },
  };
};

// The engine proves over HTTP for both kinds; the kind records whether the
// prover is the consumer's own machine or a third party that sees the keys.
const proofServerMode = (url: string): ProofServerMode => {
  const { hostname } = new URL(url);
  return hostname === 'localhost' || hostname === '127.0.0.1'
    ? { kind: 'local-host', url }
    : { kind: 'delegated', url, label: hostname };
};

const defaultProofServers = (
  proofServerUrl: string,
  networks: MidnightNetworkConfigOverrides,
  createAttestedProver?: CreateAttestedProver,
): Record<MidnightSDKNetworkId, ProofServerMode> =>
  Object.fromEntries(
    MidnightSDKNetworkId.map(networkId => {
      const mode =
        networks[networkId]?.proofServer ?? proofServerMode(proofServerUrl);
      assertProofServerRouting(mode, !!createAttestedProver);
      return [networkId, mode];
    }),
  ) as Record<MidnightSDKNetworkId, ProofServerMode>;

// The endpoints only: the proof servers are the network defaults, the modes a
// user override may select.
const networkOverrides = (
  networks: MidnightNetworkConfigOverrides,
): MidnightNetworkConfigOverrides =>
  Object.fromEntries(
    MidnightSDKNetworkId.map(networkId => {
      const { proofServer: _, ...endpoints } = networks[networkId] ?? {};
      const override: Partial<MidnightNetworkConfig> = {
        ...(isPublicNetworkId(networkId) &&
          MIDNIGHT_PUBLIC_ENDPOINTS[networkId]),
        ...endpoints,
      };
      return [networkId, override];
    }),
  );

/** The networks whose overrides carry both endpoints; the contract defaults are not served. */
const supportedNetworkIds = (
  overrides: MidnightNetworkConfigOverrides,
): MidnightSDKNetworkId[] =>
  MidnightSDKNetworkId.filter(
    networkId =>
      overrides[networkId]?.nodeAddress !== undefined &&
      overrides[networkId]?.indexerAddress !== undefined,
  );

/**
 * The Midnight engine for `createLaceWallet`: syncs every in-memory Midnight
 * account on the active network, persists its state through the loaded
 * storage module and signs with the password instead of a prompt. Loads
 * behind `FEATURE_FLAG_MIDNIGHT`. The password is copied here, but the
 * caller's buffer must stay intact until its last entity helper call that
 * takes the same bytes.
 *
 * The `config` of `createLaceWallet` must then set
 * `defaultMidnightTestnetNetworkId`, the testnet a wallet starts on, as
 * Cardano needs `defaultTestnetChainId`; without a testnet there,
 * `createLaceWallet` rejects.
 */
export const createMidnightModule = ({
  password,
  proofServerUrl = MIDNIGHT_LOCAL_PROOF_SERVER_URL,
  networks = {},
  batchUpdates,
  createAttestedProver,
}: CreateMidnightModuleProps) => {
  const overrides = networkOverrides(networks);
  return createMidnightSyncModule({
    auth: passwordAuth(password),
    networks: overrides,
    supportedNetworkIds: supportedNetworkIds(overrides),
    defaultProofServers: defaultProofServers(
      proofServerUrl,
      networks,
      createAttestedProver,
    ),
    batchUpdates,
    createAttestedProver,
  });
};
