import { hkdf } from '@noble/hashes/hkdf';
import { hmac } from '@noble/hashes/hmac';
import { sha256, sha512 } from '@noble/hashes/sha2';
import { concatBytes, utf8ToBytes } from '@noble/hashes/utils';

const MASTER_KEY = 'Symmetric key seed';
// The connector label and salt follow the MIP-0015 version 1 proposal at its
// revision of 2026-08-18, which still spells its number as a placeholder;
// re-check them against the official test vectors once those publish.
const CONNECTOR_LABEL = 'MIP-0015-connector-secret';
const HKDF_SALT = 'MIP-0015:v1';
const MIN_DOMAIN_BYTES = 1;
const MAX_DOMAIN_BYTES = 256;
const MAX_CONTEXT_BYTES = 1024;
const DEFAULT_LENGTH = 32;
const MIN_LENGTH = 16;
const MAX_LENGTH = 64;
const NODE_KEY_LENGTH = 32;
const SEPARATOR = Uint8Array.of(0);

const childNode = (node: Uint8Array, label: Uint8Array): Uint8Array =>
  hmac(
    sha512,
    node.subarray(0, NODE_KEY_LENGTH),
    concatBytes(SEPARATOR, label),
  );

/**
 * Derives a secret scoped to a domain and a context from a BIP-39 seed. The
 * same seed, domain and context derive the same secret, and the derivation is
 * one way, so a leaked secret reaches neither the seed nor a sibling domain.
 *
 * @remarks
 * The scheme walks SLIP-0021 from the seed through a fixed connector label
 * and the domain, then runs HKDF-SHA256 over the resulting node keyed by the
 * domain and context.
 *
 * The intermediate nodes are zeroed before returning; the caller owns the
 * returned secret and the seed it passed in.
 *
 * @param seed - The BIP-39 seed, such as `Mnemonic.toSeed(words)` returns.
 * @param props - The domain, the context and the secret's length.
 * @returns The secret. Throws when the domain, context or length is out of
 *   range.
 */
export const deriveSymmetricSecret = (
  seed: Uint8Array,
  {
    domain,
    context,
    length = DEFAULT_LENGTH,
  }: {
    /**
     * Names what the secret is for, 1 to 256 bytes as UTF-8. It is
     * NFC-normalised first, so two spellings of the same text name the same
     * secret.
     */
    domain: string;
    /** Distinguishes secrets within a domain, at most 1024 bytes as UTF-8, encoded as given. */
    context: string;
    /** The secret's length in bytes, 16 to 64; 32 by default. */
    length?: number;
  },
): Uint8Array => {
  const domainBytes = utf8ToBytes(domain.normalize('NFC'));
  if (
    domainBytes.length < MIN_DOMAIN_BYTES ||
    domainBytes.length > MAX_DOMAIN_BYTES
  ) {
    throw new Error(
      `MIP-0015 domain must encode to ${MIN_DOMAIN_BYTES}..${MAX_DOMAIN_BYTES} bytes, got ${domainBytes.length}`,
    );
  }
  const contextBytes = utf8ToBytes(context);
  if (contextBytes.length > MAX_CONTEXT_BYTES) {
    throw new Error(
      `MIP-0015 context must encode to at most ${MAX_CONTEXT_BYTES} bytes, got ${contextBytes.length}`,
    );
  }
  if (!Number.isInteger(length) || length < MIN_LENGTH || length > MAX_LENGTH) {
    throw new Error(
      `MIP-0015 secret length must be an integer in ${MIN_LENGTH}..${MAX_LENGTH}, got ${length}`,
    );
  }

  const master = hmac(sha512, MASTER_KEY, seed);
  const connector = childNode(master, utf8ToBytes(CONNECTOR_LABEL));
  const domainNode = childNode(connector, domainBytes);
  try {
    return hkdf(
      sha256,
      domainNode.subarray(NODE_KEY_LENGTH),
      HKDF_SALT,
      concatBytes(domainBytes, SEPARATOR, contextBytes),
      length,
    );
  } finally {
    master.fill(0);
    connector.fill(0);
    domainNode.fill(0);
  }
};
