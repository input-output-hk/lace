import type { Tagged } from 'type-fest';

const GRANT_SCOPE_SALT_BYTE_LENGTH = 32;
const LOWERCASE_HEX_PATTERN = /^[0-9a-f]+$/;

/**
 * Lowercase hex encoding of the 32-byte salt under which a grant's object,
 * relying party, caller and spend commitments are hidden. Fresh per
 * issuance; the owner keeps it to open the grant for its grantee.
 */
export type GrantScopeSalt = Tagged<string, 'GrantScopeSalt'>;

/**
 * Thrown when a value is not a lowercase hex encoding of exactly
 * GRANT_SCOPE_SALT_BYTE_LENGTH bytes.
 */
export class GrantScopeSaltError extends Error {
  public readonly code = 'invalid-length' as const;

  public constructor(message: string) {
    super(message);
    this.name = 'GrantScopeSaltError';
  }
}

/**
 * Checks that a string is 32 bytes of lowercase hex and types it as a grant
 * scope salt.
 *
 * @throws {@link GrantScopeSaltError} when it is not.
 */
export const GrantScopeSalt = (value: string): GrantScopeSalt => {
  if (
    value.length !== GRANT_SCOPE_SALT_BYTE_LENGTH * 2 ||
    !LOWERCASE_HEX_PATTERN.test(value)
  ) {
    throw new GrantScopeSaltError(
      `GrantScopeSalt expects ${GRANT_SCOPE_SALT_BYTE_LENGTH} bytes as lowercase hex, got "${value}"`,
    );
  }
  return value as GrantScopeSalt;
};
