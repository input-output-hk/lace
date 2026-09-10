import { deepEquals } from '@cardano-sdk/util';
import { convertHttpUrlToWebsocket } from '@lace-contract/midnight-context';
import { WalletFacade } from '@midnightntwrk/wallet-sdk/facade';
import {
  catchError,
  distinctUntilChanged,
  from,
  map,
  of,
  switchMap,
} from 'rxjs';

import type { SideEffect } from '../..';

/**
 * Fetches network Terms & Conditions from the indexer on each network change.
 * Stores the result in Redux; consumers fall back to the hardcoded config URL on failure.
 */
export const fetchNetworkTermsAndConditions: SideEffect = (
  _,
  { midnightContext: { selectCurrentNetwork$ } },
  { actions, logger },
) =>
  selectCurrentNetwork$.pipe(
    distinctUntilChanged(deepEquals),
    switchMap(({ config }) =>
      from(
        WalletFacade.fetchTermsAndConditions({
          indexerClientConnection: {
            indexerHttpUrl: config.indexerAddress,
            indexerWsUrl: convertHttpUrlToWebsocket(config.indexerAddress),
          },
        }),
      ).pipe(
        map(termsAndConditions =>
          actions.midnightContext.setNetworkTermsAndConditions(
            termsAndConditions,
          ),
        ),
        catchError(error => {
          logger.error('Failed to fetch network Terms & Conditions:', error);
          return of(
            actions.midnightContext.setNetworkTermsAndConditions(undefined),
          );
        }),
      ),
    ),
  );
