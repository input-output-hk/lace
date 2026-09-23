import { ArtefactIntegrityError } from '@lace-contract/passport';
import { HexBytes } from '@lace-lib/util';

import { accManifest } from './manifest';

import type { AccManifest, AccProvingCircuitName } from './manifest';

/**
 * Fetches the raw bytes at a URL. Injected so the platform decides the
 * transport: fetch in the browser, fs or http in node, fixtures in tests.
 */
export type FetchBytes = (url: string) => Promise<Uint8Array>;

/**
 * Thrown when circuit assets are requested for a circuit the manifest
 * does not pin, so a typo or a stale caller fails before any download.
 */
export class UnknownCircuitError extends Error {
  public readonly code = 'unknown-circuit' as const;

  public constructor(circuit: string) {
    super(`Unknown Account Custody Contract circuit: ${circuit}`);
    this.name = 'UnknownCircuitError';
  }
}

export type LoadCircuitAssetsProps = {
  /** Root URL of the hosted artefact bundle (holds zkir/ and keys/). */
  artefactUrl: string;
  /** Proving circuit whose assets to download. */
  circuit: AccProvingCircuitName;
  /** Transport used to download each asset. */
  fetchBytes: FetchBytes;
  /** Integrity pins to verify against; defaults to the bundled manifest. */
  manifest?: AccManifest;
};

/** The downloadable ZK assets of one proving circuit, integrity-verified. */
export type AccCircuitAssets = {
  zkir: Uint8Array;
  proverKey: Uint8Array;
  verifierKey: Uint8Array;
};

const sha256Hex = async (bytes: Uint8Array): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return HexBytes.fromByteArray(new Uint8Array(digest));
};

const fetchVerified = async (
  url: string,
  expectedSha256: string,
  fetchBytes: FetchBytes,
): Promise<Uint8Array> => {
  const bytes = await fetchBytes(url);
  const actualSha256 = await sha256Hex(bytes);
  if (actualSha256 !== expectedSha256) {
    throw new ArtefactIntegrityError(
      `sha256 mismatch for ${url}: expected ${expectedSha256}, got ${actualSha256}`,
    );
  }
  return bytes;
};

export type LoadVerifierKeyProps = {
  /** Root URL of the hosted artefact bundle (holds zkir/ and keys/). */
  artefactUrl: string;
  /** Impure circuit whose verifier key to download. */
  circuit: string;
  /** Transport used to download the key. */
  fetchBytes: FetchBytes;
  /** Expected sha256 hex digest of the key bytes. */
  expectedSha256: string;
};

/**
 * Downloads the verifier key of one Account Custody Contract impure
 * circuit from the hosted artefact bundle, verified against the given
 * sha256 pin. Deployment needs the verifier key of every impure circuit
 * to assemble the initial contract state, while proving assets exist
 * only for the circuits this module submits proofs for.
 * Throws {@link ArtefactIntegrityError} on a digest mismatch.
 */
export const loadVerifierKey = async ({
  artefactUrl,
  circuit,
  fetchBytes,
  expectedSha256,
}: LoadVerifierKeyProps): Promise<Uint8Array> => {
  const base = artefactUrl.endsWith('/')
    ? artefactUrl.slice(0, -1)
    : artefactUrl;
  return fetchVerified(
    `${base}/keys/${circuit}.verifier`,
    expectedSha256,
    fetchBytes,
  );
};

/**
 * Downloads the circuit IR and the prover and verifier keys of one
 * Account Custody Contract proving circuit from the hosted artefact
 * bundle, verifying every byte stream against the manifest's sha256 pins.
 * Throws {@link ArtefactIntegrityError} on any digest mismatch and
 * {@link UnknownCircuitError} for a circuit the manifest does not list.
 */
export const loadCircuitAssets = async ({
  artefactUrl,
  circuit,
  fetchBytes,
  manifest = accManifest,
}: LoadCircuitAssetsProps): Promise<AccCircuitAssets> => {
  const entry = manifest.circuits[circuit];
  if (!entry) throw new UnknownCircuitError(circuit);

  const base = artefactUrl.endsWith('/')
    ? artefactUrl.slice(0, -1)
    : artefactUrl;
  const [zkir, proverKey, verifierKey] = await Promise.all([
    fetchVerified(
      `${base}/zkir/${entry.name}.bzkir`,
      entry.zkirSha256,
      fetchBytes,
    ),
    fetchVerified(
      `${base}/${entry.keyLocation}.prover`,
      entry.proverKeySha256,
      fetchBytes,
    ),
    fetchVerified(
      `${base}/${entry.keyLocation}.verifier`,
      entry.verifierKeySha256,
      fetchBytes,
    ),
  ]);
  return { zkir, proverKey, verifierKey };
};
