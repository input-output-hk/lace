import { ByteArray } from '@lace-sdk/util';

// Expo export always sets process.env.NODE_ENV to 'production', even for dev
// builds. EXPO_PUBLIC_NODE_ENV is forwarded from the shell by prepare-expo-env
// and reflects the actual build intent. Falls back to NODE_ENV for non-Expo
// contexts (mobile Metro dev, webpack, tests).
export const isDevelopmentEnvironment =
  (process.env.EXPO_PUBLIC_NODE_ENV ?? process.env.NODE_ENV) !== 'production';

/**
 * Converts an array of ByteArray (mnemonic words) to a single space-separated
 * UTF-8 string for copying or comparison purposes.
 */
export const mnemonicToString = (mnemonic: ByteArray[]): string => {
  return mnemonic
    .map(wordByteArray => ByteArray.toUTF8(wordByteArray))
    .join(' ');
};

/**
 * Splits a ByteArray on space characters (0x20) without creating intermediate string copies.
 * This ensures no plaintext copies of the recovery phrase remain in memory as strings.
 *
 * @param bytes - The ByteArray to split
 * @returns Array of ByteArray words
 */
const splitBytesOnSpace = (bytes: Uint8Array): ByteArray[] => {
  const SPACE = 0x20;
  const words: ByteArray[] = [];
  let wordStart = 0;

  for (let index = 0; index <= bytes.length; index++) {
    // Split on space or end of array
    if (index === bytes.length || bytes[index] === SPACE) {
      // Skip empty words (multiple spaces, leading/trailing spaces)
      if (index > wordStart) {
        // Force a true copy: emip3decrypt returns Buffer at runtime,
        // and Buffer.prototype.slice() creates a view sharing memory.
        // new Uint8Array() forces a copy regardless of source type.
        const word = new Uint8Array(bytes.subarray(wordStart, index));
        words.push(ByteArray(word));
      }
      wordStart = index + 1;
    }
  }

  return words;
};

/**
 * Splits a ByteArray containing a space-separated mnemonic phrase into individual words.
 * Security: Operates directly on bytes without creating intermediate string copies,
 * preventing plaintext copies from remaining in memory.
 *
 * @param mnemonicByteArray - The full mnemonic phrase as a ByteArray
 * @returns Array of ByteArray words
 */
export const mnemonicToByteArrayWords = (
  mnemonicByteArray: ByteArray,
): ByteArray[] => {
  return splitBytesOnSpace(mnemonicByteArray);
};
