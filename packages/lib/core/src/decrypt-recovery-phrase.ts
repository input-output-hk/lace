/**
 * Inverse of `encryptRecoveryPhrase`: open the sealed hex blob with the
 * passphrase and split the utf8 space-joined words back out. `SecretBox.open`
 * reads both SBV1 and legacy EMIP-003 blobs, so every at-rest
 * `encryptedRecoveryPhrase` generation decrypts through this one helper.
 * Throws (SecretBox authentication failure) on a wrong passphrase.
 */
import { SecretBox } from './secret-box';
import { ByteArray } from './value-objects/bytes.vo';

import type { HexBytes } from './value-objects/bytes.vo';

export const decryptRecoveryPhrase = async (
  encrypted: HexBytes,
  passphrase: Uint8Array,
): Promise<string[]> =>
  ByteArray.toUTF8(
    ByteArray(await SecretBox.open(ByteArray.fromHex(encrypted), passphrase)),
  ).split(' ');
