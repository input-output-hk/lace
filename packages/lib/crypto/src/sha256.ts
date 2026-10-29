import { sha256 as hash } from '@noble/hashes/sha2';

/**
 * SHA-256 of `bytes` as 32 raw bytes, computed synchronously so a caller
 * that must stay synchronous, such as a consent screen encoding a grant
 * scope, has the same digest the asynchronous Web Crypto API would give.
 */
export const sha256 = (bytes: Uint8Array): Uint8Array => hash(bytes);
