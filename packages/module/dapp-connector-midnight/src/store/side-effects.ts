import { EMPTY, of, switchMap } from 'rxjs';

import {
  proveTransaction$,
  signData$,
  unlockWallet$,
} from './dapp-connector-util';

import type { SideEffect } from '../index';
import type {
  ConfirmationRequest,
  RequestType,
} from './dependencies/create-confirmation-callback';
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
) =>
  connectMidnightDappConnector({
    wallets$: midnightWallets$,
    authorizedDapps$: selectAuthorizedDapps$,
    network$: selectCurrentNetwork$,
    supportedNetworksIds$: selectSupportedNetworksIds$,
    isUnlocked$,
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

export const initializeSideEffects: LaceInitSync<SideEffect[]> = () => {
  return [connectDappConnectorApi];
};
