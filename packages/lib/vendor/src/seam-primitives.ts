// The runtime and crypto primitives this seam admits (index.ts).

// Non-SDK externals, funneled through the same audited seam (see header): `buffer` is
// the runtime polyfill core's byte value-objects use; type-fest's `Tagged` is the
// type-only nominal-typing primitive behind every value object (ADR 13).
export { Buffer } from 'buffer';
export type { Tagged } from 'type-fest';

// noble/scure-grade crypto primitives for the SBV1 SecretBox scheme (Argon2id +
// ChaCha20-Poly1305): the SDK provides only EMIP-003, so these enter here rather
// than being imported directly by core, keeping core first-party (ADR 37).
export { argon2idAsync } from '@noble/hashes/argon2';
export { randomBytes } from '@noble/hashes/utils';
export { chacha20poly1305 } from '@noble/ciphers/chacha.js';
