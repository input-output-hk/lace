import type { FailureId } from '@lace-contract/failures';
import type { TokenId } from '@lace-contract/tokens';
import type { Tagged } from 'type-fest';

/**
 * Failure ID for Cardano token metadata fetch failures.
 *
 * Stable per token so that a subsequent successful fetch (triggered either by
 * the token reappearing via `distinctWithoutMetadata` or by a user-dispatched
 * `loadTokenMetadata`) can auto-dismiss the failure.
 *
 * Format: `cardano-token-metadata-${tokenId}`
 */
export type TokenMetadataFailureId = FailureId &
  Tagged<string, 'TokenMetadataFailureId'>;

const TOKEN_METADATA_PREFIX = 'cardano-token-metadata-';

export const TokenMetadataFailureId = (
  tokenId: TokenId,
): TokenMetadataFailureId =>
  `${TOKEN_METADATA_PREFIX}${tokenId}` as TokenMetadataFailureId;
