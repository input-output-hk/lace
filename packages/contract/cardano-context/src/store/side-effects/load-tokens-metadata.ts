import { blockingWithLatestFrom } from '@cardano-sdk/util-rxjs';
import { autoDismissFailureOnSuccess } from '@lace-contract/failures';
import { PROVIDER_REQUEST_RETRY_CONFIG } from '@lace-lib/util-provider';
import { retryBackoff } from 'backoff-rxjs';
import { catchError, filter, map, merge, mergeMap, of } from 'rxjs';

import { TokenMetadataFailureId } from '../../value-objects';

import type { SideEffect } from '../../contract';
import type { TranslationKey } from '@lace-contract/i18n';

/**
 * A side effect responsible for loading and updating token metadata
 *
 * Listens to `loadTokenMetadata$` actions and uses `getTokenMetadata` from the
 * Cardano provider to fetch token metadata. Transient provider errors are
 * retried with exponential backoff. On exhaustion a failure keyed by
 * `TokenMetadataFailureId(tokenId)` is surfaced; the failure's retry action is
 * another `loadTokenMetadata` dispatch, which re-enters this side effect. On
 * success the matching failure (if any) is auto-dismissed.
 */
export const loadTokensMetadata: SideEffect = (
  { cardanoContext: { loadTokenMetadata$ } },
  { cardanoContext: { selectChainId$ }, failures: { selectFailureById$ } },
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
        getTokenMetadata({ tokenId }, { chainId }).pipe(
          map(result => {
            if (result.isErr()) throw result.unwrapErr();
            return result.unwrap();
          }),
          retryBackoff(PROVIDER_REQUEST_RETRY_CONFIG),
          mergeMap(metadata =>
            merge(
              of(
                actions.tokens.upsertTokensMetadata({
                  metadatas: [{ tokenId, ...metadata }],
                }),
              ),
              of(TokenMetadataFailureId(tokenId)).pipe(
                autoDismissFailureOnSuccess(selectFailureById$),
              ),
            ),
          ),
          catchError(() =>
            of(
              actions.failures.addFailure({
                failureId: TokenMetadataFailureId(tokenId),
                message:
                  'sync.error.token-metadata-fetch-failed' as TranslationKey,
                retryAction: actions.cardanoContext.loadTokenMetadata({
                  tokenId,
                }),
              }),
            ),
          ),
        ),
    ),
  );
