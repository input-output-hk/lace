import { toEmpty } from '@cardano-sdk/util-rxjs';
import { filter, map, merge, of, race, switchMap, take, tap } from 'rxjs';

import {
  PROVE_MIDNIGHT_TRANSACTION_LAYOUT,
  SIGN_MIDNIGHT_DATA_LAYOUT,
  WALLET_UNLOCK_LOCATION,
} from '../const';

import type { ActionCreators } from '../index';
import type { ConfirmationRequest } from './dependencies/create-confirmation-callback';
import type {
  AccessAuthSecret,
  Authenticate,
} from '@lace-contract/authentication-prompt';
import type { TranslationKey } from '@lace-contract/i18n';
import type { View } from '@lace-contract/views';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Observable } from 'rxjs';

type SharedParams = {
  actions: ActionCreators;
  selectOpenViews$: Observable<View[]>;
};

type ProveTransactionParams = SharedParams & {
  authenticate: Authenticate;
  accessAuthSecret: AccessAuthSecret;
  request: ConfirmationRequest<'proveTransaction'>;
  confirmDappTx$: Observable<unknown>;
  rejectDappTx$: Observable<unknown>;
};

type SignDataParams = SharedParams & {
  authenticate: Authenticate;
  accessAuthSecret: AccessAuthSecret;
  request: ConfirmationRequest<'signData'>;
  confirmSignData$: Observable<unknown>;
  rejectSignData$: Observable<unknown>;
};

type UnlockWalletParams = SharedParams & {
  request: ConfirmationRequest<'unlockWallet'>;
  selectLockedStatus$: Observable<string>;
};

type ConfirmableRequestParams<
  R extends 'proveTransaction' | 'signData',
  T,
  S extends string,
> = SharedParams & {
  authenticate: Authenticate;
  accessAuthSecret: AccessAuthSecret;
  request: ConfirmationRequest<R>;
  viewLocation: string;
  confirm$: Observable<unknown>;
  reject$: Observable<unknown>;
  authMessage: TranslationKey;
  setRequest: (payload: T | null) => PayloadAction<T | null, S>;
  requestPayload: T;
};

const detectViewClosure = ({
  dappConnectorView,
  selectOpenViews$,
}: {
  dappConnectorView: View;
  selectOpenViews$: Observable<View[]>;
}) =>
  selectOpenViews$.pipe(
    map(openViews => openViews.some(v => v.id === dappConnectorView.id)),
    filter(dappConnectorStillOpen => !dappConnectorStillOpen),
    take(1),
  );

// Midnight dApp connector views use V1 extension-only components (renderRoot)
// which aren't compatible with the side panel's React Native sheet stack.
// Always use popup windows until midnight views are migrated to RN sheets.
const openDappView = (
  actions: SharedParams['actions'],
  _selectOpenViews$: Observable<View[]>,
  location: string,
) =>
  of(
    actions.views.openView({
      type: 'popupWindow',
      location,
    }),
  );

const confirmableRequest$ = <
  R extends 'proveTransaction' | 'signData',
  T,
  S extends string,
>({
  authenticate,
  accessAuthSecret,
  request,
  viewLocation,
  confirm$,
  reject$,
  authMessage,
  setRequest,
  requestPayload,
  actions,
  selectOpenViews$,
}: ConfirmableRequestParams<R, T, S>) => {
  const resolveRequest = (success: boolean) => {
    request.resolve({
      isConfirmed: success,
      accessAuthSecret,
    });
  };

  const authPromptAndHandleRequestOnUserConfirmation = () =>
    confirm$.pipe(
      switchMap(() =>
        authenticate({
          cancellable: true,
          confirmButtonLabel: 'authentication-prompt.confirm-button-label',
          message: authMessage,
        }),
      ),
      filter(Boolean),
      tap(() => {
        resolveRequest(true);
      }),
    );

  const handleRequestOnUserRejection = () =>
    reject$.pipe(
      tap(() => {
        resolveRequest(false);
      }),
    );

  return merge(
    openDappView(actions, selectOpenViews$, viewLocation),
    of(setRequest(requestPayload)),
    selectOpenViews$.pipe(
      map(openViews => openViews.find(view => view.location === viewLocation)),
      filter(Boolean),
      take(1),
      switchMap(dappConnectorView =>
        race(
          race(
            authPromptAndHandleRequestOnUserConfirmation(),
            handleRequestOnUserRejection(),
          ).pipe(
            switchMap(() => [
              dappConnectorView.type === 'sidePanel'
                ? actions.views.setActiveSheetPage(null)
                : actions.views.closeView(dappConnectorView.id),
              setRequest(null),
            ]),
          ),
          detectViewClosure({ dappConnectorView, selectOpenViews$ }).pipe(
            tap(() => {
              resolveRequest(false);
            }),
            map(() => setRequest(null)),
          ),
        ),
      ),
    ),
  );
};

const proveTransactionViewLocation = `/${PROVE_MIDNIGHT_TRANSACTION_LAYOUT}`;
export const proveTransaction$ = ({
  authenticate,
  accessAuthSecret,
  request,
  selectOpenViews$,
  actions,
  confirmDappTx$,
  rejectDappTx$,
}: ProveTransactionParams) =>
  confirmableRequest$({
    authenticate,
    accessAuthSecret,
    request,
    selectOpenViews$,
    actions,
    viewLocation: proveTransactionViewLocation,
    confirm$: confirmDappTx$,
    reject$: rejectDappTx$,
    authMessage: 'authentication-prompt.message.transaction-confirmation',
    setRequest: actions.midnightDappConnector.setProveTxRequest,
    requestPayload: {
      dapp: request.requestingDapp,
      transactionType: request.transactionType ?? null,
      transactionData: request.transactionData ?? null,
    },
  });

const signDataViewLocation = `/${SIGN_MIDNIGHT_DATA_LAYOUT}`;
export const signData$ = ({
  authenticate,
  accessAuthSecret,
  request,
  selectOpenViews$,
  actions,
  confirmSignData$,
  rejectSignData$,
}: SignDataParams) =>
  confirmableRequest$({
    authenticate,
    accessAuthSecret,
    request,
    selectOpenViews$,
    actions,
    viewLocation: signDataViewLocation,
    confirm$: confirmSignData$,
    reject$: rejectSignData$,
    authMessage: 'authentication-prompt.message.sign-data',
    setRequest: actions.midnightDappConnector.setSignDataRequest,
    requestPayload: {
      dapp: request.requestingDapp,
      payload: request.signDataPayload ?? '',
      keyType: request.signDataKeyType ?? 'unshielded',
    },
  });

const unlockWalletViewLocation = `/${WALLET_UNLOCK_LOCATION}`;
export const unlockWallet$ = ({
  request,
  actions,
  selectOpenViews$,
  selectLockedStatus$,
}: UnlockWalletParams) => {
  return merge(
    openDappView(actions, selectOpenViews$, unlockWalletViewLocation),
    selectOpenViews$.pipe(
      map(openViews =>
        openViews.find(view => view.location === unlockWalletViewLocation),
      ),
      filter(Boolean),
      take(1),
      switchMap(dappConnectorView =>
        race(
          selectLockedStatus$.pipe(
            filter(status => status === 'unlocked'),
            take(1),
            tap(() => {
              request.resolve({
                isConfirmed: true,
              });
            }),
            map(() =>
              dappConnectorView.type === 'sidePanel'
                ? actions.views.setActiveSheetPage(null)
                : actions.views.closeView(dappConnectorView.id),
            ),
          ),
          detectViewClosure({ dappConnectorView, selectOpenViews$ }).pipe(
            tap(() => {
              request.resolve({
                isConfirmed: false,
              });
            }),
            toEmpty,
          ),
        ),
      ),
    ),
  );
};
