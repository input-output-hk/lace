import type { Tagged } from 'type-fest';

const GRANT_ID_BYTE_LENGTH = 32;
const LOWERCASE_HEX_PATTERN = /^[0-9a-f]+$/;

/**
 * Lowercase hex encoding of the 32-byte identifier that keys a scoped
 * grant in the Account Custody Contract's grants map.
 */
export type GrantId = Tagged<string, 'GrantId'>;

/**
 * Thrown when a value is not a lowercase hex encoding of exactly
 * GRANT_ID_BYTE_LENGTH bytes.
 */
export class GrantIdError extends Error {
  public readonly code = 'invalid-length' as const;

  public constructor(message: string) {
    super(message);
    this.name = 'GrantIdError';
  }
}

/**
 * Checks that a string is 32 bytes of lowercase hex and types it as a grant
 * identifier.
 *
 * @throws {@link GrantIdError} when it is not.
 */
export const GrantId = (value: string): GrantId => {
  if (
    value.length !== GRANT_ID_BYTE_LENGTH * 2 ||
    !LOWERCASE_HEX_PATTERN.test(value)
  ) {
    throw new GrantIdError(
      `GrantId expects ${GRANT_ID_BYTE_LENGTH} bytes as lowercase hex, got "${value}"`,
    );
  }
  return value as GrantId;
};
