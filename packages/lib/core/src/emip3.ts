/**
 * EMIP-003 password-based encryption (PBKDF2-HMAC-SHA512 + ChaCha20-Poly1305).
 *
 * Re-exported from `@cardano-sdk/key-management` through the `@lace-lib/vendor`
 * seam (ADR 37). Host, guest, monolith and migration share the identical
 * implementation, so a vault blob written by one decrypts in another **by
 * construction** — the ADR 38 byte-compatibility needs no separate equivalence gate.
 */
export { emip3decrypt, emip3encrypt } from '@lace-lib/vendor';
