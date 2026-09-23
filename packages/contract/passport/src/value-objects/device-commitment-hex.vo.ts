import type { Tagged } from 'type-fest';

const DEVICE_COMMITMENT_BYTE_LENGTH = 32;
const LOWERCASE_HEX_PATTERN = /^[0-9a-f]+$/;

/**
 * Lowercase hex encoding of a device authoriser's 32-byte commitment, as
 * stored by the Account Custody Contract.
 */
export type DeviceCommitmentHex = Tagged<string, 'DeviceCommitmentHex'>;

/**
 * Thrown when a value is not a lowercase hex encoding of exactly
 * DEVICE_COMMITMENT_BYTE_LENGTH bytes.
 */
export class DeviceCommitmentHexError extends Error {
  public readonly code = 'invalid-length' as const;

  public constructor(message: string) {
    super(message);
    this.name = 'DeviceCommitmentHexError';
  }
}

export const DeviceCommitmentHex = (value: string): DeviceCommitmentHex => {
  if (
    value.length !== DEVICE_COMMITMENT_BYTE_LENGTH * 2 ||
    !LOWERCASE_HEX_PATTERN.test(value)
  ) {
    throw new DeviceCommitmentHexError(
      `DeviceCommitmentHex expects ${DEVICE_COMMITMENT_BYTE_LENGTH} bytes as lowercase hex, got "${value}"`,
    );
  }
  return value as DeviceCommitmentHex;
};
