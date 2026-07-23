/**
 * SBV1 (Argon2id + ChaCha20-Poly1305) encryption of a mnemonic recovery phrase:
 * encrypt the utf8 bytes of the space-joined words with the passphrase, returning
 * hex. New wallets are sealed with SBV1; `SecretBox.open` still reads legacy
 * EMIP-003 blobs through the `@lace-lib/vendor` seam (ADR 37/38).
 */
import { util } from '@lace-lib/vendor';

import { SecretBox } from './secret-box';
import { ByteArray, HexBytes } from './value-objects/bytes.vo';

export const encryptRecoveryPhrase = async (
  words: string[],
  passphrase: Uint8Array,
): Promise<HexBytes> =>
  HexBytes.fromByteArray(
    await SecretBox.seal(
      ByteArray.fromUTF8(util.joinMnemonicWords(words)),
      passphrase,
    ),
  );
