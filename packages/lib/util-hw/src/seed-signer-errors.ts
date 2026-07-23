/** Stable error code for a QR export scanned from a different device than the wallet. */
export const WRONG_DEVICE_CODE = 'SEED_SIGNER_WRONG_DEVICE';

/**
 * Thrown when a scanned seed-signer account export resolves to a different
 * wallet id (device master fingerprint) than the wallet the account is being
 * added to. The stable {@link code} and {@link name} let callers branch
 * without matching prose.
 */
export class WrongDeviceError extends Error {
  public readonly code = WRONG_DEVICE_CODE;

  public constructor(message = WRONG_DEVICE_CODE) {
    super(message);
    this.name = WRONG_DEVICE_CODE;
  }
}
