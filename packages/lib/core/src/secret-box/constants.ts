/**
 * Length, in bytes, of the key derived by Argon2id and consumed by
 * ChaCha20-Poly1305. Fixed at the ChaCha20 key size and therefore not stored
 * in the envelope.
 */
export const DERIVED_KEY_LEN = 32;
