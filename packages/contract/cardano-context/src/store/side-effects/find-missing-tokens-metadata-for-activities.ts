import { Milliseconds } from '@cardano-sdk/core';
import { blockingWithLatestFrom } from '@cardano-sdk/util-rxjs';
import uniq from 'lodash/uniq';
import { debounceTime, from, mergeMap } from 'rxjs';

import type { SideEffect } from '../../contract';
import type { Activity } from '@lace-contract/activities';
import type { MetadataByTokenId, TokenId } from '@lace-contract/tokens';

/**
 * Extracts and returns a list of unique token IDs that are missing metadata.
 *
 * @param activities - An array of activity objects, each containing token balance changes.
 * @param tokensMetadataById - An object mapping token IDs to their metadata.
 * @returns An array of unique token IDs for which metadata is missing.
 */
export const getTokenIdsWithoutMetadata = (
  activities: Activity[],
  tokensMetadataById: MetadataByTokenId,
): TokenId[] =>
  uniq(
    activities.flatMap(a => a.tokenBalanceChanges.map(t => t.tokenId)),
  ).filter(id => !tokensMetadataById[id]);

/**
 * Creates a side effect to find missing token metadata for activities.
 *
 * This function ensures that the application keeps track of activities in the system and identifies
 * tokens that lack metadata. It fetches and loads missing token metadata by dispatching an appropriate
 * action. The function uses a debounced mechanism to optimize performance and reduce redundant computations.
 *
 * @param [options] - Configuration options for the function.
 * @param [options.debounce=Milliseconds(1000)] - The debounce time in milliseconds to
 *        prevent frequent re-executions of the logic as activities in the store change.
 */
export const findMissingTokensMetadataForActivities =
  (
    { debounce }: { debounce: Milliseconds } = { debounce: Milliseconds(1000) },
  ): SideEffect =>
  (_, { tokens, activities }, { actions }) =>
    activities.selectAllFlat$.pipe(
      // This would be re-run every time an activity is added to the store otherwise
      debounceTime(debounce),
      blockingWithLatestFrom(tokens.selectTokensMetadata$),
      mergeMap(([activities, tokensMetadataById]) =>
        from(
          getTokenIdsWithoutMetadata(activities, tokensMetadataById).map(
            tokenId =>
              actions.cardanoContext.loadTokenMetadata({
                tokenId,
              }),
          ),
        ),
      ),
    );
