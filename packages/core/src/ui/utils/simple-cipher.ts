import { getSecureRandomNumber } from './secure-random';

const ALPHABET_RANGE_START = 96;
const ALPHABET_RANGE_END = 122;
const CIPHER_SHIFT = ALPHABET_RANGE_END - ALPHABET_RANGE_START;

export const simpleCipher = (value: string): string => {
  let output = '';
  for (const char of value) {
    const charShift = Math.floor(getSecureRandomNumber() * CIPHER_SHIFT);
    const newCode = char.charCodeAt(0) + (charShift % CIPHER_SHIFT);
    newCode <= ALPHABET_RANGE_END
      ? (output += String.fromCharCode(newCode))
      : (output += String.fromCharCode(ALPHABET_RANGE_START + (newCode % ALPHABET_RANGE_END)));
  }
  return output;
};
