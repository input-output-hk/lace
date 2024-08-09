const BYTES_IN_64_BITS = 8;
const BITS_PER_BYTE = 8;
const BITS_IN_8_BYTES = 64;
const BINARY_BASE = 2;

/**
 * Generates a cryptographically secure random number between 0 and 1.
 *
 * This function utilizes the Web Crypto API to generate a random number
 * that is cryptographically secure.
 *
 * @returns {number} A cryptographically secure random floating-point number
 * between 0 (inclusive) and 1 (exclusive).
 *
 * @note This function is browser-specific as it relies on the window.crypto
 * object provided by modern web browsers.
 */
export const getSecureRandomNumber = (): number => {
  const byteArray = new Uint8Array(BYTES_IN_64_BITS);

  window.crypto.getRandomValues(byteArray);

  let randomValue = 0;

  for (const [i, element] of byteArray.entries()) {
    randomValue += element * BINARY_BASE ** (BITS_PER_BYTE * i);
  }

  return randomValue / BINARY_BASE ** BITS_IN_8_BYTES;
};
