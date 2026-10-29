import { AttestationError } from './attested-proving-service';
import { TEMENOS_PROOF_SERVER_MODES } from './midnight-proof-servers';

import type {
  AttestedProverProvider,
  AttestedProvingSession,
} from './attested-proving-service';
import type { AttestationProgressEvent } from './midnight-proof-servers';

/** Structural boundary for the pinned Temenos verifier; no private package imports. */
type VerificationPhase =
  | 'bind-channel'
  | 'fetch-expected-values'
  | 'obtain-evidence'
  | 'prove'
  | 'verify-locally'
  | 'warden-verify';
type LocalCheckId =
  | 'ak-extraction'
  | 'epoch-key-binding'
  | 'nonce-freshness'
  | 'pcr15-recompute'
  | 'pcrs-0-4-vs-record'
  | 'report-data-binding'
  | 'report-fields-vs-record'
  | 'snp-signature-chain'
  | 'tpm-quote-pcr-digest'
  | 'tpm-quote-signature';
type PhaseEvent =
  | {
      phase: 'verify-locally';
      status: 'check';
      check: { id: LocalCheckId; status: 'failed' | 'passed'; detail: string };
    }
  | { phase: VerificationPhase; status: 'completed'; detail?: string }
  | { phase: VerificationPhase; status: 'failed'; error: Error }
  | { phase: VerificationPhase; status: 'started' };
type VerifiedSession = {
  prove(request: {
    body: Uint8Array;
  }): Promise<{ status: number; body: Uint8Array }>;
  close(): Promise<void>;
};

/** Baked deployment and a snapshot of host-reviewed roots, passed to each fresh verifier. */
type VerifierConfig = {
  attestationHost: string;
  proofServerApiUrl: string;
  wardenUrl: string;
  applicationId: string;
  akxServerUrl?: string;
  pointerContractAddress: string;
  indexerUrl: string;
  amdRootCertificates: string[];
  wardenTlsCertificate: string;
  sessionTtlMs?: number;
};

/**
 * Trusted host implementation of the Temenos pipeline. Construct a fresh verifier
 * and its AKX dependencies from the supplied config on every call. Supply the
 * error classes from the same library instance so diagnostics retain their identity.
 */
export type TemenosVerifier = {
  LocalCheckFailedError: abstract new (...args: never[]) => Error & {
    readonly checkId: LocalCheckId;
  };
  AttestationVerificationError: abstract new (...args: never[]) => Error & {
    readonly phase: VerificationPhase;
  };
  createVerifier(
    config: VerifierConfig,
    signal?: AbortSignal,
  ): {
    establishVerifiedSession(
      onPhase?: (event: PhaseEvent) => void,
    ): Promise<VerifiedSession>;
  };
};

/** Temenos vocabulary stays inside the Temenos implementation. */
export type TemenosAttestationPhaseId = Exclude<VerificationPhase, 'prove'>;
export type TemenosAttestationCheckId = Exclude<
  LocalCheckId,
  'nonce-freshness'
>;
/** Host-reviewed AMD root certificates used to verify Temenos attestation evidence. */
export type TemenosTrustRoots = {
  readonly amdRootCertificates: readonly string[];
};

export class TemenosAttestationError extends AttestationError {
  public constructor(
    readonly phase: TemenosAttestationPhaseId,
    readonly checkId?: TemenosAttestationCheckId,
  ) {
    super(
      'temenos',
      phase === 'obtain-evidence'
        ? 'evidence'
        : phase === 'fetch-expected-values'
        ? 'policy'
        : phase === 'bind-channel'
        ? 'channel'
        : 'appraisal',
      checkId
        ? `Temenos attestation failed: check "${checkId}" of phase "${phase}"`
        : `Temenos attestation failed at phase "${phase}"`,
    );
    this.name = 'TemenosAttestationError';
  }
}

/** A baked config whose AKX endpoint is mandatory — Lace only ships the AKX flow. */
type TemenosAttestationConfig = Omit<
  VerifierConfig,
  'amdRootCertificates' | 'indexerUrl'
> & {
  akxServerUrl: string;
};

/**
 * `pointerContractAddress` is the one on-chain constant: the pointer's
 * `current` cell names the attestation ledger, so a ledger redeploy is a
 * pointer update, not a Lace release. All Temenos deployments register on the
 * single preprod pointer, whatever network the proof server serves, so this
 * stays on preprod on every network. The caller resolves the ledger
 * indexer from Lace configuration at the start of each attestation run.
 *
 * `wardenTlsCertificate` is empty by design: a browser context cannot pin
 * the transport certificate, so the Warden is reached over public WebPKI
 * TLS — its verdict is defense-in-depth on top of the local checks, not a
 * trust root.
 */
const SHARED_TEMENOS_DEPLOYMENT: Pick<
  TemenosAttestationConfig,
  'pointerContractAddress' | 'wardenTlsCertificate' | 'wardenUrl'
> = {
  pointerContractAddress:
    'a58974f1cacda177edfea3bdc76c1cd48d5e3107b9a543b9d65cee6b454c9122',
  wardenUrl: 'https://warden.wastedp.io',
  wardenTlsCertificate: '',
};

const TEMENOS_PREPROD_DEPLOYMENT: TemenosAttestationConfig = {
  ...SHARED_TEMENOS_DEPLOYMENT,
  proofServerApiUrl: 'https://api.proofserver.wastedp.io',
  attestationHost: 'attestation.proofserver.wastedp.io',
  akxServerUrl: 'https://attestation.proofserver.wastedp.io/tee_attestation',
  applicationId:
    'afe48970b7083e1b2855acce95a488e93a7c257a34f6275e77ac26f79ac7ad05',
};

const TEMENOS_MAINNET_DEPLOYMENT: TemenosAttestationConfig = {
  ...SHARED_TEMENOS_DEPLOYMENT,
  proofServerApiUrl: 'https://api.proofserver.mainnet.wastedp.io',
  attestationHost: 'attestation.proofserver.mainnet.wastedp.io',
  akxServerUrl:
    'https://attestation.proofserver.mainnet.wastedp.io/tee_attestation',
  applicationId:
    '70402462424c122c65e2d3d2312757face3974940c9ac5d09249b61028350427',
};

const TEMENOS_PREVIEW_DEPLOYMENT: TemenosAttestationConfig = {
  ...SHARED_TEMENOS_DEPLOYMENT,
  proofServerApiUrl: 'https://api.proofserver.preview.wastedp.io',
  attestationHost: 'attestation.proofserver.preview.wastedp.io',
  akxServerUrl:
    'https://attestation.proofserver.preview.wastedp.io/tee_attestation',
  applicationId:
    'b294b8879607f7d0f5cca3808a4b64aab7992de2a73d1e55dbafb091efca25f2',
};

/**
 * Attestation parameters per network, matching `TEMENOS_PROOF_SERVER_MODES`
 * entry for entry. Values are build-baked and reviewed like code; the
 * persisted mode carries only the URL, so nothing here can be injected via
 * feature-flag payloads.
 */
const TEMENOS_ATTESTATION_CONFIGS: Partial<
  Record<string, TemenosAttestationConfig>
> = {
  mainnet: TEMENOS_MAINNET_DEPLOYMENT,
  preprod: TEMENOS_PREPROD_DEPLOYMENT,
  preview: TEMENOS_PREVIEW_DEPLOYMENT,
};

// Drift assertion (spec §2.2): every baked tee-delegated mode must have its
// attestation parameters here, for the same proof server — throwing at
// module load beats silently offering a mode that cannot attest.
for (const [networkId, mode] of Object.entries(TEMENOS_PROOF_SERVER_MODES)) {
  if (!mode) continue;
  const config = TEMENOS_ATTESTATION_CONFIGS[networkId];
  if (config?.proofServerApiUrl !== mode.url) {
    throw new Error(
      `TEMENOS_PROOF_SERVER_MODES[${networkId}] ("${mode.url}") has no matching entry in TEMENOS_ATTESTATION_CONFIGS`,
    );
  }
}

/** temenos-spec phases 1–5 of the AKX flow, in execution order. */
const TEMENOS_ATTESTATION_PHASES: readonly TemenosAttestationPhaseId[] = [
  'obtain-evidence',
  'fetch-expected-values',
  'verify-locally',
  'warden-verify',
  'bind-channel',
];

const PHASE_MAP: Record<
  Exclude<VerificationPhase, 'prove'>,
  TemenosAttestationPhaseId
> = {
  'obtain-evidence': 'obtain-evidence',
  'fetch-expected-values': 'fetch-expected-values',
  'verify-locally': 'verify-locally',
  'warden-verify': 'warden-verify',
  'bind-channel': 'bind-channel',
};

/**
 * `nonce-freshness` belongs to the library's SPKI-pin flow, which Lace never
 * runs (the AKX evidence provider always yields epoch-key evidence) — it has
 * no contract ID, so its events are dropped rather than mislabeled.
 */
const mapCheckId = (id: LocalCheckId): TemenosAttestationCheckId | undefined =>
  id === 'nonce-freshness' ? undefined : id;

const mapPhaseEvent = (
  event: PhaseEvent,
): AttestationProgressEvent | undefined => {
  if (event.status === 'check') {
    const id = mapCheckId(event.check.id);
    if (!id) return undefined;
    return {
      type: 'check',
      check: { id, status: event.check.status, detail: event.check.detail },
    };
  }
  // The service owns the `proving` step: it emits `started` before the
  // payload leaves and `completed`/`failed` on the result. The library also
  // reports its own `prove` phase inside that window; forwarding it would
  // double the row and leave its `status=200` detail stuck on it.
  if (event.phase === 'prove') return undefined;
  const phase = PHASE_MAP[event.phase];
  switch (event.status) {
    case 'started':
      return { type: 'phase', phase, status: 'started' };
    case 'completed':
      return {
        type: 'phase',
        phase,
        status: 'completed',
        ...(event.detail === undefined ? {} : { detail: event.detail }),
      };
    case 'failed':
      return {
        type: 'phase',
        phase,
        status: 'failed',
        detail: event.error.message,
      };
  }
};

const toTemenosAttestationError = (
  error: unknown,
  fallbackPhase: TemenosAttestationPhaseId,
  { LocalCheckFailedError, AttestationVerificationError }: TemenosVerifier,
): TemenosAttestationError => {
  const mapped =
    error instanceof LocalCheckFailedError
      ? new TemenosAttestationError('verify-locally', mapCheckId(error.checkId))
      : error instanceof AttestationVerificationError
      ? new TemenosAttestationError(
          error.phase === 'prove' ? fallbackPhase : PHASE_MAP[error.phase],
        )
      : new TemenosAttestationError(fallbackPhase);
  mapped.cause = error;
  return mapped;
};

/**
 * `/prove` payloads travel as AEAD records tunneled through the AKX channel.
 * The enclave proxy forwards to `/prove` only, so the session offers nothing
 * else: the public API endpoint is never contacted from this flow.
 */
const createTunneledSession = (
  session: VerifiedSession,
): AttestedProvingSession => ({
  prove: async payload => {
    const response = await session.prove({ body: payload });
    if (response.status !== 200) {
      throw new Error(
        `Proof server returned ${response.status} through the attested channel`,
      );
    }
    return response.body;
  },
  close: async () => session.close(),
});

type TemenosAttestedProverProps = {
  networkId: string;
  proofServerApiUrl: string;
  trustRoots: TemenosTrustRoots;
  /** Reads the attestation ledger's indexer URL at the start of each run. */
  getLedgerIndexerUrl: () => Promise<string>;
  verifier: TemenosVerifier;
};

/**
 * {@link createTemenosAttestedProver} with a deployment override that replaces
 * the baked deployment and skips its proof-server URL match. No public entry
 * re-exports it; only tests driving the verifier library's mock fixtures pass
 * the override.
 *
 * @internal
 */
export const createTemenosAttestedProverWith = (
  {
    networkId,
    proofServerApiUrl,
    trustRoots,
    getLedgerIndexerUrl,
    verifier,
  }: TemenosAttestedProverProps,
  testSeam?: {
    config?: Omit<VerifierConfig, 'amdRootCertificates' | 'indexerUrl'>;
  },
): AttestedProverProvider => {
  // The persisted mode may predate a per-network deployment change; its URL
  // must still name the proof server this network's baked config attests.
  const baked = TEMENOS_ATTESTATION_CONFIGS[networkId];
  const deployment =
    testSeam?.config ??
    (baked?.proofServerApiUrl === proofServerApiUrl ? baked : undefined);
  if (!deployment) {
    throw new Error(
      `No baked Temenos attestation config on ${networkId} for proof server "${proofServerApiUrl}"`,
    );
  }
  if (
    !trustRoots?.amdRootCertificates?.length ||
    trustRoots.amdRootCertificates.some(root => root.trim().length === 0)
  ) {
    throw new AttestationError(
      'temenos',
      'policy',
      'Temenos requires explicit AMD trust roots',
    );
  }
  // Snapshot the supplied roots; later caller mutation cannot widen trust.
  const amdRootCertificates = [...trustRoots.amdRootCertificates];
  return {
    id: 'temenos',
    operations: ['prove'],
    phases: TEMENOS_ATTESTATION_PHASES,
    establishAttestedSession: async (onEvent, signal) => {
      signal?.throwIfAborted();
      const config: VerifierConfig = {
        ...deployment,
        amdRootCertificates,
        indexerUrl: await getLedgerIndexerUrl(),
      };
      // A fresh verifier per run: re-verification is per-proof,
      // never the library's session-TTL cadence.
      const operationVerifier = verifier.createVerifier(config, signal);
      let currentPhase: TemenosAttestationPhaseId = 'obtain-evidence';
      try {
        const session = await operationVerifier.establishVerifiedSession(
          event => {
            if (event.status === 'started') signal?.throwIfAborted();
            if (event.status === 'started' && event.phase !== 'prove')
              currentPhase = PHASE_MAP[event.phase];
            const mapped = mapPhaseEvent(event);
            if (mapped) onEvent(mapped);
          },
        );
        return createTunneledSession(session);
      } catch (error) {
        throw toTemenosAttestationError(error, currentPhase, verifier);
      }
    },
  };
};

/**
 * The real Temenos attestation driver: runs the verifier library's full
 * pipeline — evidence from `GET /enclave-key`, expected values from the
 * on-chain registration via the indexer, the nine local checks against
 * explicitly supplied AMD roots, Warden verification, and the AKX
 * attested-channel handshake — then hands back a session that tunnels
 * through that channel. Trust-root sourcing is separate from this adapter.
 * Only the deployment baked for `networkId` is accepted, and only
 * when `proofServerApiUrl` names its proof server.
 */
export const createTemenosAttestedProver = (
  props: TemenosAttestedProverProps,
): AttestedProverProvider => createTemenosAttestedProverWith(props);
