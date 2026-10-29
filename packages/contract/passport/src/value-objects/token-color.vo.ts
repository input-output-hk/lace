import type { Tagged } from 'type-fest';

const TOKEN_COLOR_BYTE_LENGTH = 32;
const LOWERCASE_HEX_PATTERN = /^[0-9a-f]+$/;

/**
 * Lowercase hex encoding of the 32-byte color that identifies a Midnight
 * token type, as a grant names the token it may withdraw.
 */
export type TokenColor = Tagged<string, 'TokenColor'>;

/**
 * Thrown when a value is not a lowercase hex encoding of exactly
 * TOKEN_COLOR_BYTE_LENGTH bytes.
 */
export class TokenColorError extends Error {
  public readonly code = 'invalid-length' as const;

  public constructor(message: string) {
    super(message);
    this.name = 'TokenColorError';
  }
}

/**
 * Checks that a string is 32 bytes of lowercase hex and types it as a token
 * color.
 *
 * @throws {@link TokenColorError} when it is not.
 */
export const TokenColor = (value: string): TokenColor => {
  if (
    value.length !== TOKEN_COLOR_BYTE_LENGTH * 2 ||
    !LOWERCASE_HEX_PATTERN.test(value)
  ) {
    throw new TokenColorError(
      `TokenColor expects ${TOKEN_COLOR_BYTE_LENGTH} bytes as lowercase hex, got "${value}"`,
    );
  }
  return value as TokenColor;
};
