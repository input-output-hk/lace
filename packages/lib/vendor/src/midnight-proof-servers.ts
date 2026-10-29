/**
 * Discriminated union describing how Midnight proofs are generated for a
 * given network. Each kind carries the parameters the wallet needs to wire
 * up that backend; `in-process` uses WASM, while `paired-device` remains
 * reserved for a mobile-companion mode.
 *
 * Key-exposure boundary (trust-tier order, strongest first):
 *   - `in-process`   — proofs in the wallet process; keys never copied across
 *                      a boundary.
 *   - `local-host`   — local proof server (e.g. Docker) reached on localhost;
 *                      keys cross an in-OS process boundary.
 *   - `paired-device`— a device the user owns (e.g. their phone); keys cross
 *                      a network boundary but stay within the user's hardware.
 *   - `tee-delegated`— third-party hosted proof server running inside a
 *                      hardware-attested trusted execution environment;
 *                      keys are transmitted, but attestation is verified
 *                      before every proof so the operator cannot inspect them.
 *   - `delegated`    — third-party hosted proof server; keys are transmitted
 *                      to the provider.
 */
export type ProofServerMode =
  | {
      kind: 'delegated';
      url: string;
      label: string;
      descriptionKey?: string;
    }
  | {
      kind: 'tee-delegated';
      /**
       * Proof-server API URL. Also the stable identity of the mode and the
       * lookup key into the baked per-network Temenos config — attestation
       * parameters (endpoints, trust anchors) deliberately do not live on
       * the mode, which is persisted in redux; they stay in code.
       */
      url: string;
      label: string;
      descriptionKey?: string;
    }
  | { kind: 'in-process' }
  | { kind: 'local-host'; url: string }
  | { kind: 'paired-device'; url: string; pairingId: string };

/**
 * Stable identity for a mode — what we compare to decide if two selections
 * refer to the same option (e.g. for radio-button highlighting and for
 * deciding whether the user's pick differs from the default).
 *
 * Labels/descriptions are denormalised metadata; they may drift across
 * application updates, so identity is keyed on `kind` + `url`/`pairingId`.
 */
export const isSameProofServerMode = (
  a: ProofServerMode,
  b: ProofServerMode,
): boolean => {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'in-process':
      return true;
    case 'local-host':
      return (
        a.url === (b as Extract<ProofServerMode, { kind: 'local-host' }>).url
      );
    case 'paired-device': {
      const right = b as Extract<ProofServerMode, { kind: 'paired-device' }>;
      return a.url === right.url && a.pairingId === right.pairingId;
    }
    case 'delegated':
      return (
        a.url === (b as Extract<ProofServerMode, { kind: 'delegated' }>).url
      );
    case 'tee-delegated':
      return (
        a.url === (b as Extract<ProofServerMode, { kind: 'tee-delegated' }>).url
      );
  }
};

/** Returns the configured HTTP endpoint, or undefined for in-process proving. */
export const getProofServerEndpoint = (
  mode: ProofServerMode,
): string | undefined => ('url' in mode ? mode.url : undefined);

const TEMENOS_PREPROD_DEPLOYMENT_MODE: Extract<
  ProofServerMode,
  { kind: 'tee-delegated' }
> = {
  kind: 'tee-delegated',
  url: 'https://api.proofserver.wastedp.io',
  label: 'Temenos (remote TEE proof server)',
  descriptionKey: 'midnight.proof-server.tee-delegated.description',
};

const TEMENOS_MAINNET_DEPLOYMENT_MODE: Extract<
  ProofServerMode,
  { kind: 'tee-delegated' }
> = {
  kind: 'tee-delegated',
  url: 'https://api.proofserver.mainnet.wastedp.io',
  label: 'Temenos (remote TEE proof server)',
  descriptionKey: 'midnight.proof-server.tee-delegated.description',
};

const TEMENOS_PREVIEW_DEPLOYMENT_MODE: Extract<
  ProofServerMode,
  { kind: 'tee-delegated' }
> = {
  kind: 'tee-delegated',
  url: 'https://api.proofserver.preview.wastedp.io',
  label: 'Temenos (remote TEE proof server)',
  descriptionKey: 'midnight.proof-server.tee-delegated.description',
};

/**
 * Contract-visible part of the baked Temenos TEE proof-server config, per
 * network: just enough for `selectAllProofServerModes` to synthesize the
 * settings row without importing module code. The heavyweight attestation
 * config (evidence/Warden endpoints, application id, AMD root certificates)
 * lives in the vendor Temenos driver, keyed by the same network id and
 * cross-checked against this mode's `url` at module load.
 *
 * Values are build-baked and reviewed like code (rotating an endpoint
 * requires a release); the remote feature flag only toggles visibility.
 */
export const TEMENOS_PROOF_SERVER_MODES: Partial<
  Record<string, Extract<ProofServerMode, { kind: 'tee-delegated' }>>
> = {
  ['mainnet']: TEMENOS_MAINNET_DEPLOYMENT_MODE,
  ['preprod']: TEMENOS_PREPROD_DEPLOYMENT_MODE,
  ['preview']: TEMENOS_PREVIEW_DEPLOYMENT_MODE,
};

/** Source-controlled ordinary remote providers. Currently empty: the Midnight
 * Foundation service was decommissioned. Keep the selection infrastructure;
 * a feature flag or legacy payload must not resurrect a retired endpoint. */
export const REMOTE_PROOF_SERVER_MODES: Partial<
  Record<string, Extract<ProofServerMode, { kind: 'delegated' }>>
> = {};

export const DEFAULT_LOCAL_PROOF_SERVER_URL = 'http://localhost:6300';

export const defaultLocalProofServerMode: ProofServerMode = {
  kind: 'local-host',
  url: DEFAULT_LOCAL_PROOF_SERVER_URL,
};

/** Provider-owned phase/check IDs. Temenos keeps its existing wire values. */
export type AttestationPhaseId = string;
export type AttestationCheckId = string;

export type AttestationCheckResult = {
  id: AttestationCheckId;
  /** Owning phase; absent on legacy Temenos events (verify-locally). */
  phase?: AttestationPhaseId;
  status: 'failed' | 'passed';
  detail?: string;
};

/** Diagnostic progress only; these events never authorize a proof operation. */
export type AttestationPhaseEvent = {
  type: 'phase';
  phase: AttestationPhaseId;
  status: 'completed' | 'failed' | 'started';
  detail?: string;
};

export type AttestationProgressEvent =
  | AttestationPhaseEvent
  | { type: 'check'; check: AttestationCheckResult }
  | { type: 'reset'; steps: AttestationPhaseId[] };

export type ProofServerTransport = {
  check: (payload: Uint8Array, signal?: AbortSignal) => Promise<Uint8Array>;
  prove: (payload: Uint8Array, signal?: AbortSignal) => Promise<Uint8Array>;
};

/** Refuses unsupported modes and routes recognized TEE hosts only through attestation. */
export const assertProofServerRouting = (
  mode: ProofServerMode,
  hasAttestedProver: boolean,
  hasLocalProver = false,
): void => {
  if (mode.kind === 'in-process' && hasLocalProver) return;
  if (mode.kind === 'in-process' || mode.kind === 'paired-device')
    throw new Error(`Unsupported Midnight proof server mode "${mode.kind}"`);
  const hostname = new URL(mode.url).hostname.replace(/\.$/, '');
  const isRecognizedTee = Object.values(TEMENOS_PROOF_SERVER_MODES).some(
    candidate =>
      candidate &&
      new URL(candidate.url).hostname.replace(/\.$/, '') === hostname,
  );
  if (isRecognizedTee && mode.kind !== 'tee-delegated')
    throw new Error(
      'Cannot attest a TEE proof server through ordinary HTTP; select tee-delegated',
    );
  if (mode.kind === 'tee-delegated' && !hasAttestedProver)
    throw new Error(
      'Cannot attest Midnight proof server: proof server mode "tee-delegated" needs an attested prover',
    );
};

/** Circuit data stays inside the wallet's proving boundary for every backend. */
export type ProofCircuitRequest = {
  serializedPreimage: Uint8Array;
  keyLocation: string;
  keyMaterial?: {
    proverKey: Uint8Array;
    verifierKey: Uint8Array;
    ir: Uint8Array;
  };
  overwriteBindingInput?: bigint;
};

export type { CircuitProvider as ProofCircuitProvider } from '@lace-lib/midnight-prover';
