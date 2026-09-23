import type {
  AccAddress,
  DeviceCommitmentHex,
  DeviceEpoch,
  UseCounter,
} from './value-objects';

/**
 * Signature scheme used by a Passport authoriser. Only the Jubjub Schnorr
 * scheme is supported today; the union leaves room for the curve-agnostic
 * authorisers later phases add.
 */
export type AuthScheme = 'jubjub-schnorr';

/**
 * A circuit call awaiting authorisation by a device key.
 */
export interface AuthorisationRequest {
  account: AccAddress;
  circuit: string;
  args: readonly unknown[];
  witnessValues: readonly unknown[];
  authNonce: bigint;
  useCounter: UseCounter;
}

/**
 * Proof of authorisation produced by a device key for one
 * AuthorisationRequest. `scheme` discriminates the curve-agnostic variants
 * later phases add; only 'jubjub-schnorr' exists today.
 */
export type Authorisation = {
  scheme: 'jubjub-schnorr';
  pk: { x: bigint; y: bigint };
  useCounter: bigint;
  sigR: { x: bigint; y: bigint };
  sigS: bigint;
  grindNonce: bigint;
};

/**
 * Curve-agnostic device authoriser. Wraps one device's passkey-derived
 * signing key and produces authorisations for Account Custody Contract
 * circuit calls.
 */
export interface PassportAuthoriser {
  readonly scheme: AuthScheme;
  deviceCommitment: (
    account: AccAddress,
    epoch: DeviceEpoch,
    counter: UseCounter,
  ) => Promise<DeviceCommitmentHex>;
  /**
   * Computes the device entry commitment for many candidate counters
   * within a single key ceremony, so implementations backed by an
   * interactive ceremony (one user prompt per key access) can amortise
   * the prompt across the batch. Returns one commitment per counter, in
   * order. Optional: callers fall back to per-counter deviceCommitment
   * when absent.
   */
  deviceCommitments?: (
    account: AccAddress,
    epoch: DeviceEpoch,
    counters: readonly UseCounter[],
  ) => Promise<DeviceCommitmentHex[]>;
  devicePublicKey: () => Promise<{ x: bigint; y: bigint }>;
  authorise: (request: AuthorisationRequest) => Promise<Authorisation>;
  /**
   * AES-GCM key derived from the same key source as the signing key, used
   * to seal the persisted account record at rest. Optional: authorisers
   * without a second derivable secret (the dev authoriser) leave the
   * record unsealed. Implementations must not rely on `this`; callers
   * pass the function around detached.
   */
  storageKey?: () => Promise<CryptoKey>;
  /**
   * Runs `operation` under a single key ceremony, so an implementation
   * backed by an interactive ceremony (one user prompt per key access)
   * prompts once for a whole flow instead of once per call. A nested call
   * joins the open session rather than starting another. The derived key
   * material lives only until the operation settles and is destroyed
   * afterwards. Optional: an implementation without an interactive
   * ceremony omits it, and callers then run the operation directly.
   * Implementations must not rely on `this`; callers pass the function
   * around detached.
   */
  withKeySession?: <T>(operation: () => Promise<T>) => Promise<T>;
}

/**
 * Sponsors the transaction fee for a Passport account operation so the
 * user can transact without holding tokens.
 */
export interface FeeSponsor {
  balanceAndSign: (unbalancedTx: Uint8Array) => Promise<Uint8Array>;
}

/**
 * Produces or checks a zero-knowledge proof for a circuit call.
 * `keyLocation` names the circuit whose key material the implementation
 * resolves on the client side; the serialized proof preimage travels
 * opaque and the response bytes come back unparsed. The ledger may pass
 * `overwriteBindingInput` when proving; a proof built without it fails
 * on-chain verification, so implementations must forward it verbatim.
 */
export interface PassportProver {
  prove: (
    preimage: Uint8Array,
    keyLocation: string,
    overwriteBindingInput?: bigint,
  ) => Promise<Uint8Array>;
  check: (preimage: Uint8Array, keyLocation: string) => Promise<Uint8Array>;
}

/**
 * Endpoints needed to reach the Midnight network a Passport account is
 * deployed on. `networkId` names the network for the Midnight libraries
 * themselves (address formats and transaction binding depend on it), for
 * example `undeployed` for a local devnet.
 */
export interface PassportNetworkConfig {
  networkId: string;
  indexerUrl: string;
  indexerWsUrl: string;
  nodeUrl: string;
  artefactUrl: string;
}

/**
 * Platform-specific capabilities a Passport module implementation must
 * supply: the device authoriser, fee sponsor, prover, and network
 * endpoints.
 */
export interface PassportDependencies {
  passportAuthoriser: PassportAuthoriser;
  passportSponsor: FeeSponsor;
  passportProver: PassportProver;
  passportNetwork: PassportNetworkConfig;
}
