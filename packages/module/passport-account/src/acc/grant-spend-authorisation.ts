/**
 * A grantee's signature over a grant spend's challenge, by its scheme. A
 * secp256k1 grantee signs plain ECDSA over the SHA-256 digest of the
 * challenge, and gives the signature's `r` and `s`. A jubjub grantee
 * gives its Schnorr signature: the announcement `sigR`, the response
 * `sigS` and the `grindNonce` under which the challenge it signed falls
 * below the jubjub subgroup order.
 */
export type GrantSpendSignature =
  | {
      scheme: 'jubjub-schnorr';
      sigR: { x: bigint; y: bigint };
      sigS: bigint;
      grindNonce: bigint;
    }
  | { scheme: 'secp256k1-ecdsa'; r: bigint; s: bigint };

/**
 * The trailing arguments a grant withdrawal takes after the ones a spend
 * preparation returns: the ECDSA signature as one `{ r, s }` argument for
 * a secp256k1 grantee, and the announcement, response and grind nonce for
 * a jubjub grantee. The circuit's full arguments are the preparation's
 * `args` followed by these.
 */
export const grantSpendAuthorisationArgs = (
  signature: GrantSpendSignature,
): unknown[] =>
  signature.scheme === 'secp256k1-ecdsa'
    ? [{ r: signature.r, s: signature.s }]
    : [signature.sigR, signature.sigS, signature.grindNonce];
