import { EMPTY, merge, of, Subject, switchMap } from 'rxjs';

import {
  proveTransaction$,
  signData$,
  unlockWallet$,
} from './dapp-connector-util';

import type { ActionCreators, SideEffect } from '../index';
import type {
  ConfirmationRequest,
  RequestType,
} from './dependencies/create-confirmation-callback';
import type { ActionType } from '@lace-contract/module';
import type { LaceInitSync } from '@lace-contract/module';

const isRequestOfType = <R extends RequestType>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request: ConfirmationRequest<any>,
  requestType: R,
): request is ConfirmationRequest<R> =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  'type' in request && request.type === requestType;

export const connectDappConnectorApi: SideEffect = (
  {
    midnightDappConnector: {
      confirmDappTx$,
      rejectDappTx$,
      confirmSignData$,
      rejectSignData$,
    },
  },
  {
    views: { selectOpenViews$ },
    appLock: { isUnlocked$ },
    dappConnector: { selectAuthorizedDapps$ },
    midnightContext: { selectCurrentNetwork$, selectSupportedNetworksIds$ },
  },
  {
    connectMidnightDappConnector,
    midnightWallets$,
    actions,
    authenticate,
    accessAuthSecret,
  },
) => {
  const pendingActivityDispatch$ = new Subject<ActionType<ActionCreators>>();

  const connector$ = connectMidnightDappConnector({
    wallets$: midnightWallets$,
    authorizedDapps$: selectAuthorizedDapps$,
    network$: selectCurrentNetwork$,
    supportedNetworksIds$: selectSupportedNetworksIds$,
    isUnlocked$,
    onPendingActivity: activity => {
      pendingActivityDispatch$.next(
        actions.activities.upsertActivities({
          accountId: activity.accountId,
          activities: [activity],
        }),
      );
    },
    handleRequests: request$ => {
      return request$.pipe(
        switchMap(request => {
          if (isRequestOfType(request, 'unlockWallet')) {
            return unlockWallet$({
              request,
              selectOpenViews$,
              selectLockedStatus$: of('unlocked'),
              actions,
            });
          }

          if (isRequestOfType(request, 'signData')) {
            return signData$({
              authenticate,
              accessAuthSecret,
              request,
              actions,
              selectOpenViews$,
              confirmSignData$,
              rejectSignData$,
            });
          }

          if (isRequestOfType(request, 'proveTransaction')) {
            return proveTransaction$({
              authenticate,
              accessAuthSecret,
              request,
              actions,
              selectOpenViews$,
              confirmDappTx$,
              rejectDappTx$,
            });
          }

          return EMPTY;
        }),
      );
    },
  });

  return merge(connector$, pendingActivityDispatch$);
};

export const initializeSideEffects: LaceInitSync<SideEffect[]> = () => {
  return [connectDappConnectorApi];
};
