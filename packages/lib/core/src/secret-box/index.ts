import { isSealed } from './format';
import { setArgon2idImplementation } from './kdf';
import { open } from './open';
import { seal } from './seal';

export type { Argon2idImplementation, Argon2idParams } from './kdf';

/**
 * Password-based authenticated encryption for wallet secrets at rest.
 *
 * @remarks
 * `seal` writes the `SBV1` scheme (Argon2id key derivation followed by
 * ChaCha20-Poly1305). `open` reads both `SBV1` and legacy EMIP-003 blobs,
 * selecting the path from the blob's magic; EMIP-003 blobs are decrypted through
 * the SDK's `emip3decrypt` via the `@lace-lib/vendor` seam. `isSealed` reports
 * whether a blob is `SBV1` (versus legacy EMIP-003), so callers can decide
 * whether to route decryption through this scheme.
 * `setArgon2idImplementation` replaces the Argon2id implementation used for
 * key derivation.
 */
export const SecretBox = { seal, open, isSealed, setArgon2idImplementation };
