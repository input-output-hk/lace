import { blockingWithLatestFrom } from '@cardano-sdk/util-rxjs';
import { mergeMap, map, filter } from 'rxjs';

import type { SideEffect } from '../../contract';

/**
 * A side effect responsible for loading and updating token metadata
 *
 * Listens to `loadTokenMetadata$` actions and uses `getTokenMetadata` from the
 * Cardano provider to fetch token metadata. Dispatches actions to update the
 * application state with the retrieved metadata, or handling failure by dispatching
 * error actions with details of the failure.
 */
export const loadTokensMetadata: SideEffect = (
  { cardanoContext: { loadTokenMetadata$ } },
  { cardanoContext: { selectChainId$ } },
  { actions, cardanoProvider: { getTokenMetadata } },
) =>
  loadTokenMetadata$.pipe(
    blockingWithLatestFrom(selectChainId$.pipe(filter(Boolean))),
    mergeMap(
      ([
        {
          payload: { tokenId },
        },
        chainId,
      ]) =>
        // TODO: Reduce TX details re-fetches
        // https://input-output.atlassian.net/browse/LW-13522
        getTokenMetadata({ tokenId }, { chainId }).pipe(
          map(getTokenMetadataResult =>
            getTokenMetadataResult.isOk()
              ? actions.tokens.upsertTokensMetadata({
                  metadatas: [
                    {
                      tokenId,
                      ...getTokenMetadataResult.unwrap(),
                    },
                  ],
                })
              : actions.cardanoContext.getTokenMetadataFailed({
                  tokenId,
                  failure: getTokenMetadataResult.error.reason,
                }),
          ),
        ),
    ),
  );
