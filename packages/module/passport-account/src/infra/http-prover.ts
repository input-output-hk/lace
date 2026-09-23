import { ArtefactIntegrityError } from '@lace-contract/passport';

import { loadCircuitAssets } from '../acc/artefact-loader';
import { accManifest } from '../acc/manifest';

import type { FetchBytes } from '../acc/artefact-loader';
import type { AccManifest } from '../acc/manifest';
import type { PassportProver } from '@lace-contract/passport';
import type { ProvingKeyMaterial } from '@midnight-ntwrk/midnight-js-protocol/ledger';

/**
 * Thrown when the proof server rejects a request or does not answer before
 * the timeout. `status` carries the HTTP status code of the final response;
 * it is undefined when the request timed out before any response arrived.
 */
export class ProofServerError extends Error {
  public readonly code = 'proof-server' as const;

  public constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'ProofServerError';
  }
}

/**
 * Subset of the Fetch API the prover uses. Injected so the platform picks
 * the transport and node tests run without a network.
 */
export type ProverFetch = (
  url: string,
  init: {
    method: 'POST';
    headers: Record<string, string>;
    body: Uint8Array;
    signal: AbortSignal;
  },
) => Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
}>;

/**
 * Resolves a key location to the client-held key material of its circuit.
 * Returns undefined for locations the client holds no material for (the
 * protocol builtins); the proof server supplies those keys itself.
 */
export type KeyMaterialResolver = (
  keyLocation: string,
) => Promise<ProvingKeyMaterial | undefined>;

export type CreateManifestKeyMaterialResolverProps = {
  /** Root URL of the hosted artefact bundle (holds zkir/ and keys/). */
  artefactUrl: string;
  /** Transport used to download each asset. */
  fetchBytes: FetchBytes;
  /** Integrity pins to verify against; defaults to the bundled manifest. */
  manifest?: AccManifest;
};

/**
 * Canonical contract key location: `contract:<address>/<circuit>?vk=<hash>`.
 * The ledger stamps every contract call's proof preimage with this form;
 * the vk query pin is the sha256 of the verifier key the chain expects.
 */
const CANONICAL_KEY_LOCATION =
  /^contract:[0-9a-f]+\/([^?]+)(?:\?vk=([0-9a-f]+))?$/;

/**
 * The default {@link KeyMaterialResolver}: maps a key location onto the
 * Account Custody Contract manifest and downloads that circuit's prover
 * key, verifier key, and IR through {@link loadCircuitAssets}, so every
 * byte is verified against the manifest's sha256 pins. Canonical contract
 * locations resolve by circuit name, and their embedded vk pin must match
 * the manifest's, so proving against a drifted artefact fails before the
 * proof server is asked. A location the manifest does not list resolves
 * to undefined (a protocol builtin the proof server supplies itself).
 */
export const createManifestKeyMaterialResolver = ({
  artefactUrl,
  fetchBytes,
  manifest = accManifest,
}: CreateManifestKeyMaterialResolverProps): KeyMaterialResolver => {
  const entries = Object.values(manifest.circuits);
  return async keyLocation => {
    const canonical = CANONICAL_KEY_LOCATION.exec(keyLocation);
    const circuitName = canonical ? canonical[1] : keyLocation;
    const vkPin = canonical?.[2];
    const entry = entries.find(
      candidate =>
        candidate.keyLocation === keyLocation || candidate.name === circuitName,
    );
    if (!entry) return undefined;
    if (vkPin !== undefined && vkPin !== entry.verifierKeySha256) {
      throw new ArtefactIntegrityError(
        `verifier key pin mismatch for ${entry.name}: the chain expects ${vkPin}, the manifest pins ${entry.verifierKeySha256}`,
      );
    }
    const assets = await loadCircuitAssets({
      artefactUrl,
      circuit: entry.name,
      fetchBytes,
      manifest,
    });
    return {
      proverKey: assets.proverKey,
      verifierKey: assets.verifierKey,
      ir: assets.zkir,
    };
  };
};

/** Proving a circuit call can legitimately take minutes on large circuits. */
const TIMEOUT_MS = 300_000;

/** A 500/503 is transient (proof server busy or restarting); one retry. */
const RETRYABLE_STATUSES = new Set([500, 503]);

const defaultFetchBytes: FetchBytes = async url => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Artefact download failed: url="${url}", status="${response.status} ${response.statusText}"`,
    );
  }
  return new Uint8Array(await response.arrayBuffer());
};

export type HttpProverOptions = {
  /**
   * Resolves key locations to key material. Defaults to
   * {@link createManifestKeyMaterialResolver} over `artefactUrl`.
   */
  resolveKeyMaterial?: KeyMaterialResolver;
  /** Artefact bundle root the default resolver downloads from. */
  artefactUrl?: string;
  /** Artefact download transport for the default resolver; defaults to fetch. */
  fetchBytes?: FetchBytes;
  /** Proof server transport; defaults to the global fetch. */
  fetchHttp?: ProverFetch;
};

/**
 * A {@link PassportProver} over the Midnight proof server's HTTP API,
 * wire-compatible with the stock midnight-js client: the key location is
 * resolved client-side to the circuit's key material (prover key and IR),
 * the serialized preimage plus that material is framed with the protocol
 * payload codecs, and the framed bytes are POSTed to /prove and /check as
 * application/octet-stream with nothing else. A location the resolver
 * does not know travels without key material; the proof server supplies
 * the protocol builtin keys itself. The protocol codec loads lazily so
 * platforms only pay for it when a proof is actually requested.
 */
export const createHttpProver = (
  baseUrl: string,
  options: HttpProverOptions = {},
): PassportProver => {
  const fetchHttp =
    options.fetchHttp ?? (globalThis.fetch as unknown as ProverFetch);
  const resolveKeyMaterial =
    options.resolveKeyMaterial ??
    (options.artefactUrl === undefined
      ? undefined
      : createManifestKeyMaterialResolver({
          artefactUrl: options.artefactUrl,
          fetchBytes: options.fetchBytes ?? defaultFetchBytes,
        }));
  if (!resolveKeyMaterial) {
    throw new Error(
      'createHttpProver needs resolveKeyMaterial or an artefactUrl for the default manifest resolver.',
    );
  }

  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const loadPayloadCodec = async () =>
    import('@midnight-ntwrk/midnight-js-protocol/ledger');

  const request = async (url: string, payload: Uint8Array) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, TIMEOUT_MS);
    try {
      return await fetchHttp(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: payload,
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new ProofServerError(
          `Proof server request timed out after ${TIMEOUT_MS}ms: ${url}`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };

  const post = async (
    path: string,
    payload: Uint8Array,
  ): Promise<Uint8Array> => {
    const url = `${base}${path}`;
    for (let attempt = 0; ; attempt++) {
      const response = await request(url, payload);
      if (response.ok) return new Uint8Array(await response.arrayBuffer());
      if (attempt === 0 && RETRYABLE_STATUSES.has(response.status)) continue;
      throw new ProofServerError(
        `Proof server request failed: url="${url}", status="${response.status} ${response.statusText}"`,
        response.status,
      );
    }
  };

  return {
    prove: async (preimage, keyLocation, overwriteBindingInput) => {
      const [{ createProvingPayload }, keyMaterial] = await Promise.all([
        loadPayloadCodec(),
        resolveKeyMaterial(keyLocation),
      ]);
      return post(
        '/prove',
        createProvingPayload(preimage, overwriteBindingInput, keyMaterial),
      );
    },
    check: async (preimage, keyLocation) => {
      const [{ createCheckPayload }, keyMaterial] = await Promise.all([
        loadPayloadCodec(),
        resolveKeyMaterial(keyLocation),
      ]);
      return post('/check', createCheckPayload(preimage, keyMaterial?.ir));
    },
  };
};
