/** Upstream revision of the vendored blueprint. */
export const CUSTODY_CONTRACT_REVISION =
  'b48545f4be850c1044de2dbeb51751718b4b8e70';

/** Compiler the blueprint names in its preamble. */
export const CUSTODY_CONTRACT_COMPILER = 'Aiken v1.1.24+bacbeb3';

/**
 * SHA-256 of the vendored `plutus.json`, byte for byte as upstream committed
 * it. Re-pinning the blueprint changes this value; a script hash changes only
 * when that validator's code changes.
 */
export const CUSTODY_BLUEPRINT_SHA256 =
  '8b48096f70a5d0cb207659fcc7875b5f0639f7822604c6e7db439212b5374dde';
