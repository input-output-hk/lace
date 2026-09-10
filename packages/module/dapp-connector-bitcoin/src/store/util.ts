import { isSidePanelApiAvailable } from '@lace-contract/views';
import {
  filter,
  last,
  map,
  merge,
  of,
  race,
  switchMap,
  take,
  takeWhile,
  tap,
} from 'rxjs';

import {
  BITCOIN_DAPP_SIGN_MESSAGE_LOCATION,
  BITCOIN_DAPP_SIGN_MESSAGE_SHEET_ROUTE,
  BITCOIN_DAPP_SIGN_TX_LOCATION,
  BITCOIN_DAPP_SIGN_TX_SHEET_ROUTE,
} from '../const';

import type { ActionCreators } from '../index';
import type { BitcoinConfirmationRequest } from './dependencies/create-confirmation-callback';
import type { ActionType, ViewId } from '@lace-contract/module';
import type { View } from '@lace-contract/views';
import type { Observable } from 'rxjs';

/**
 * Outcome of running a signer for one request (or one PSBT of a batch),
 * reported by the signing wrappers to the review flow.
 */
export type BitcoinSigningResult = {
  type: 'cancelled' | 'error' | 'success';
};

/**
 * Shared parameters for the review flow utilities.
 */
export type SharedParams = {
  /** Redux action creators */
  actions: ActionCreators;
  /** Observable of currently open views */
  selectOpenViews$: Observable<View[]>;
};

/**
 * Parameters for the signMessage review flow.
 */
export type SignMessageParams = SharedParams & {
  /** The confirmation request from the dApp */
  request: BitcoinConfirmationRequest;
  /** Emits when the user confirms message signing */
  confirmSignMessage$: Observable<unknown>;
  /** Emits when the user rejects message signing */
  rejectSignMessage$: Observable<unknown>;
  /** Emits when a view disconnects (popup or side panel closed) */
  viewDisconnected$: Observable<{ payload: ViewId }>;
  /** Signals signing completion from the signing wrapper */
  signingResult$: Observable<BitcoinSigningResult>;
};

/**
 * Parameters for the signPsbt review flow.
 */
export type SignPsbtParams = SharedParams & {
  /** The confirmation request from the dApp */
  request: BitcoinConfirmationRequest;
  /** Emits when the user confirms PSBT signing */
  confirmSignPsbt$: Observable<unknown>;
  /** Emits when the user rejects PSBT signing */
  rejectSignPsbt$: Observable<unknown>;
  /** Emits when a view disconnects (popup or side panel closed) */
  viewDisconnected$: Observable<{ payload: ViewId }>;
  /** Signals signing completion from the signing wrapper, once per PSBT */
  signingResult$: Observable<BitcoinSigningResult>;
};

/**
 * Detects when a popup view is closed by the user.
 *
 * @returns Observable that emits once when the view is no longer open
 */
export const detectViewClosure = ({
  dappConnectorView,
  selectOpenViews$,
}: {
  dappConnectorView: View;
  selectOpenViews$: Observable<View[]>;
}) =>
  selectOpenViews$.pipe(
    map(openViews => openViews.some(view => view.id === dappConnectorView.id)),
    filter(dappConnectorStillOpen => !dappConnectorStillOpen),
    take(1),
  );

/**
 * Finds the side panel view for a specific browser window, or any side panel
 * if no windowId is provided. Returns undefined on browsers without the side
 * panel API, so the flow falls back to a popup window.
 */
export const findTargetSidePanel = (openViews: View[], windowId?: number) => {
  if (!isSidePanelApiAvailable()) return undefined;
  if (windowId !== undefined) {
    return openViews.find(
      view => view.type === 'sidePanel' && view.windowId === windowId,
    );
  }
  return openViews.find(view => view.type === 'sidePanel');
};

const openDappSheet = (
  actions: SharedParams['actions'],
  selectOpenViews$: Observable<View[]>,
  target: {
    sheetRoute: string;
    sheetParams: Record<string, unknown>;
    popupWindowLocation: string;
    windowId?: number;
  },
) =>
  selectOpenViews$.pipe(
    take(1),
    switchMap(openViews => {
      const sidePanel = findTargetSidePanel(openViews, target.windowId);
      if (sidePanel) {
        return of(
          actions.views.setActiveSheetPage({
            route: target.sheetRoute,
            params: target.sheetParams,
            targetViewId: sidePanel.id,
          }),
        );
      }
      return of(
        actions.views.openView({
          type: 'popupWindow',
          location: target.popupWindowLocation,
        }),
      );
    }),
  );

const toDappSheetIcon = (imageUrl?: string) => ({
  type: 'uri' as const,
  uri: imageUrl ?? '',
});

/**
 * Collapses the per-PSBT signing results of one confirmation into a single
 * outcome: the first cancellation or error wins immediately, success is
 * reported only after every PSBT in the batch signed.
 */
const batchSigningOutcome$ = (
  signingResult$: Observable<BitcoinSigningResult>,
  expectedResultCount: number,
): Observable<BitcoinSigningResult> =>
  signingResult$.pipe(
    takeWhile(result => result.type === 'success', true),
    take(Math.max(expectedResultCount, 1)),
    last(),
  );

type SignFlowParams = SharedParams & {
  request: BitcoinConfirmationRequest;
  confirm$: Observable<unknown>;
  reject$: Observable<unknown>;
  viewDisconnected$: Observable<{ payload: ViewId }>;
  signingResult$: Observable<BitcoinSigningResult>;
  expectedResultCount: number;
  sheetRoute: string;
  sheetParams: Record<string, unknown>;
  popupWindowLocation: string;
  setPendingAction: ActionType<ActionCreators>;
  clearPendingAction: () => ActionType<ActionCreators>;
  setCompletedAction: () => ActionType<ActionCreators>;
  setErrorAction: () => ActionType<ActionCreators>;
};

/**
 * Runs one review flow: opens the review UI (side panel sheet in the sender
 * window when one is open, popup window otherwise), publishes the pending
 * request, and races user confirm/reject against the review view closing.
 * Closure resolves the dApp request as not confirmed. On confirmation the
 * dApp request resolves immediately and the flow waits for the signing
 * outcome to drive the success or error screen. Success and error leave the
 * review UI open so it can show the result (the sheet closes on the result
 * screen's Close button, the popup closes itself once the request clears);
 * cancellation and rejection still close the UI here.
 */
const signFlow$ = ({
  actions,
  selectOpenViews$,
  request,
  confirm$,
  reject$,
  viewDisconnected$,
  signingResult$,
  expectedResultCount,
  sheetRoute,
  sheetParams,
  popupWindowLocation,
  setPendingAction,
  clearPendingAction,
  setCompletedAction,
  setErrorAction,
}: SignFlowParams): Observable<ActionType<ActionCreators>> => {
  const resultActions = (
    result: BitcoinSigningResult | { type: 'rejected' },
    closeUiActions: ActionType<ActionCreators>[],
  ): ActionType<ActionCreators>[] => {
    if (result.type === 'success') {
      return [setCompletedAction(), clearPendingAction()];
    }
    if (result.type === 'cancelled') {
      return [...closeUiActions, clearPendingAction()];
    }
    if (result.type === 'error') {
      return [setErrorAction(), clearPendingAction()];
    }
    return [...closeUiActions, clearPendingAction()];
  };

  const confirmOrReject$ = race(
    confirm$.pipe(
      take(1),
      tap(() => {
        request.resolve({ isConfirmed: true });
      }),
      switchMap(() =>
        batchSigningOutcome$(signingResult$, expectedResultCount),
      ),
    ),
    reject$.pipe(
      take(1),
      tap(() => {
        request.resolve({ isConfirmed: false });
      }),
      map(() => ({ type: 'rejected' as const })),
    ),
  );

  return merge(
    openDappSheet(actions, selectOpenViews$, {
      sheetRoute,
      sheetParams,
      popupWindowLocation,
      windowId: request.windowId,
    }),
    of(setPendingAction),
    selectOpenViews$.pipe(
      take(1),
      switchMap(openViews => {
        const sidePanel = findTargetSidePanel(openViews, request.windowId);
        if (sidePanel) {
          return race(
            confirmOrReject$.pipe(
              switchMap(result =>
                resultActions(result, [actions.views.setActiveSheetPage(null)]),
              ),
            ),
            viewDisconnected$.pipe(
              filter(({ payload }) => payload === sidePanel.id),
              take(1),
              tap(() => {
                request.resolve({ isConfirmed: false });
              }),
              switchMap(() => [
                actions.views.setActiveSheetPage(null),
                clearPendingAction(),
              ]),
            ),
          );
        }
        return selectOpenViews$.pipe(
          map(views =>
            views.find(view => view.location === popupWindowLocation),
          ),
          filter(Boolean),
          take(1),
          switchMap(dappConnectorView =>
            race(
              confirmOrReject$.pipe(
                switchMap(result =>
                  resultActions(result, [
                    actions.views.closeView(dappConnectorView.id),
                  ]),
                ),
              ),
              merge(
                viewDisconnected$.pipe(
                  filter(({ payload }) => payload === dappConnectorView.id),
                ),
                detectViewClosure({ dappConnectorView, selectOpenViews$ }),
              ).pipe(
                take(1),
                tap(() => {
                  request.resolve({ isConfirmed: false });
                }),
                map(() => clearPendingAction()),
              ),
            ),
          ),
        );
      }),
    ),
  );
};

/**
 * Handles the message signing (signMessage) review flow.
 */
export const signMessage$ = ({
  request,
  selectOpenViews$,
  actions,
  confirmSignMessage$,
  rejectSignMessage$,
  viewDisconnected$,
  signingResult$,
}: SignMessageParams): Observable<ActionType<ActionCreators>> => {
  const { requestingDapp } = request;
  const requestId = `${requestingDapp.origin}-signMessage-${Date.now()}`;
  const dapp = {
    name: requestingDapp.name,
    origin: requestingDapp.origin,
    imageUrl: requestingDapp.imageUrl || undefined,
  };
  const address = request.address ?? '';
  const message = request.message ?? '';
  const signatureType = request.signatureType ?? 'ecdsa';

  return signFlow$({
    actions,
    selectOpenViews$,
    request,
    confirm$: confirmSignMessage$,
    reject$: rejectSignMessage$,
    viewDisconnected$,
    signingResult$,
    expectedResultCount: 1,
    sheetRoute: BITCOIN_DAPP_SIGN_MESSAGE_SHEET_ROUTE,
    sheetParams: {
      requestId,
      dapp: {
        icon: toDappSheetIcon(requestingDapp.imageUrl),
        name: requestingDapp.name,
        origin: requestingDapp.origin,
      },
      address,
      message,
      signatureType,
    },
    popupWindowLocation: BITCOIN_DAPP_SIGN_MESSAGE_LOCATION,
    setPendingAction: actions.bitcoinDappConnector.setPendingSignMessageRequest(
      {
        requestId,
        dappOrigin: requestingDapp.origin,
        dapp,
        address,
        message,
        signatureType,
      },
    ),
    clearPendingAction: () =>
      actions.bitcoinDappConnector.clearPendingSignMessageRequest(),
    setCompletedAction: () =>
      actions.bitcoinDappConnector.setSignMessageCompleted(true),
    setErrorAction: () =>
      actions.bitcoinDappConnector.setSignMessageError(true),
  });
};

/**
 * Handles the PSBT signing (signPsbt) review flow. A single
 * confirmation covers the whole batch; the success screen shows only after
 * every PSBT signed, while the first cancellation or error ends the flow.
 */
export const signPsbt$ = ({
  request,
  selectOpenViews$,
  actions,
  confirmSignPsbt$,
  rejectSignPsbt$,
  viewDisconnected$,
  signingResult$,
}: SignPsbtParams): Observable<ActionType<ActionCreators>> => {
  const { requestingDapp } = request;
  const requestId = `${requestingDapp.origin}-signPsbt-${Date.now()}`;
  const psbtsBase64 = request.psbtsBase64 ?? [];

  return signFlow$({
    actions,
    selectOpenViews$,
    request,
    confirm$: confirmSignPsbt$,
    reject$: rejectSignPsbt$,
    viewDisconnected$,
    signingResult$,
    expectedResultCount: psbtsBase64.length,
    sheetRoute: BITCOIN_DAPP_SIGN_TX_SHEET_ROUTE,
    sheetParams: {
      requestId,
      dapp: {
        icon: toDappSheetIcon(requestingDapp.imageUrl),
        name: requestingDapp.name,
        origin: requestingDapp.origin,
      },
      psbtsBase64,
      options: request.options,
    },
    popupWindowLocation: BITCOIN_DAPP_SIGN_TX_LOCATION,
    setPendingAction: actions.bitcoinDappConnector.setPendingSignPsbtRequest({
      requestId,
      dappOrigin: requestingDapp.origin,
      dapp: {
        name: requestingDapp.name,
        origin: requestingDapp.origin,
        imageUrl: requestingDapp.imageUrl || undefined,
      },
      psbtsBase64,
      currentIndex: 0,
      accountId: request.accountId,
      options: request.options,
    }),
    clearPendingAction: () =>
      actions.bitcoinDappConnector.clearPendingSignPsbtRequest(),
    setCompletedAction: () =>
      actions.bitcoinDappConnector.setSignPsbtCompleted(true),
    setErrorAction: () => actions.bitcoinDappConnector.setSignPsbtError(true),
  });
};
