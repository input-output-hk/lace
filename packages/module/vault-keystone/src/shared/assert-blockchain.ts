/**
 * Throws when a connector receives a request for a blockchain it does not
 * support. The device label prefixes the error message.
 */
export const assertBlockchain = (
  expected: string,
  actual: string,
  deviceLabel: string,
): void => {
  if (actual !== expected) {
    throw new Error(`${deviceLabel} only supports ${expected}, got ${actual}`);
  }
};
