import { RecordCorruptedError } from '@lace-contract/passport';
import { ByteArray, HexBytes } from '@lace-lib/util';

/** AES-GCM is specified for 96-bit IVs; each seal draws a fresh one. */
const IV_LENGTH = 12;

/**
 * The at-rest form of the persisted account record: the JSON-encoded
 * record encrypted under the passkey-derived storage key. `iv` and
 * `ciphertext` are lowercase hex; `v` versions the envelope layout.
 */
export type SealedRecord = {
  v: 1;
  iv: string;
  ciphertext: string;
};

const utf8 = (value: string): Uint8Array<ArrayBuffer> =>
  new TextEncoder().encode(value) as Uint8Array<ArrayBuffer>;

/** Whether a stored value has the sealed envelope layout. */
export const isSealedRecord = (value: unknown): value is SealedRecord => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<SealedRecord>;
  return (
    candidate.v === 1 &&
    typeof candidate.iv === 'string' &&
    typeof candidate.ciphertext === 'string'
  );
};

/** Encrypts a record into a {@link SealedRecord} under the given key. */
export const sealRecord = async <T>(
  key: CryptoKey,
  record: T,
): Promise<SealedRecord> => {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    utf8(JSON.stringify(record)),
  );
  return {
    v: 1,
    iv: HexBytes.fromByteArray(iv),
    ciphertext: HexBytes.fromByteArray(new Uint8Array(ciphertext)),
  };
};

/**
 * Decrypts a {@link SealedRecord} back into the record it sealed. Any
 * failure to open - a tampered ciphertext, a mismatched key, or a
 * malformed envelope - throws RecordCorruptedError.
 */
export const openRecord = async <T>(
  key: CryptoKey,
  sealed: SealedRecord,
): Promise<T> => {
  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ByteArray.fromHex(HexBytes(sealed.iv)) as BufferSource,
      },
      key,
      ByteArray.fromHex(HexBytes(sealed.ciphertext)) as BufferSource,
    );
    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } catch {
    throw new RecordCorruptedError();
  }
};
