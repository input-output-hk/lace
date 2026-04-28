import { filter, map, merge, of, race, switchMap, take, tap } from 'rxjs';

import {
  CARDANO_DAPP_SIGN_DATA_LOCATION,
  CARDANO_DAPP_SIGN_TX_LOCATION,
} from '../const';

import type { SigningResult } from '../../common/store/dependencies/cardano-dapp-connector-api';
import type { CardanoConfirmationRequest } from '../../common/store/dependencies/create-confirmation-callback';
import type { ActionCreators } from '../../index';
import type { ViewId } from '@lace-contract/module';
import type { View } from '@lace-contract/views';
import type { Observable } from 'rxjs';

export type { SigningResult };

/**
 * Shared parameters for all dApp connector utility functions.
 */
export type SharedParams = {
  /** Redux action creators */
  actions: ActionCreators;
  /** Observable of currently open views */
  selectOpenViews$: Observable<View[]>;
};

/**
 * Parameters for the signTx flow utility function.
 */
export type SignTxParams = SharedParams & {
  /** The confirmation request from the dApp */
  request: CardanoConfirmationRequest;
  /** Observable that emits when user confirms transaction */
  confirmSignTx$: Observable<unknown>;
  /** Observable that emits when user rejects transaction */
  rejectSignTx$: Observable<unknown>;
  /** Observable that emits when a view disconnects (popup closed) */
  viewDisconnected$: Observable<{ payload: ViewId }>;
  /** Observable that signals signing completion from the wrapper */
  signingResult$: Observable<SigningResult>;
};

/**
 * Parameters for the signData flow utility function.
 */
export type SignDataParams = SharedParams & {
  /** The confirmation request from the dApp */
  request: CardanoConfirmationRequest;
  /** Observable that emits when user confirms data signing */
  confirmSignData$: Observable<unknown>;
  /** Observable that emits when user rejects data signing */
  rejectSignData$: Observable<unknown>;
  /** Observable that emits when a view disconnects (popup closed) */
  viewDisconnected$: Observable<{ payload: ViewId }>;
  /** Observable that signals signing completion from the API */
  signingResult$: Observable<SigningResult>;
};

/**
 * Detects when a popup view is closed by the user.
 *
 * @param params - Object containing dappConnectorView and selectOpenViews$
 * @param params.dappConnectorView - The view to monitor for closure
 * @param params.selectOpenViews$ - Observable of currently open views
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
    map(openViews => openViews.some(v => v.id === dappConnectorView.id)),
    filter(dappConnectorStillOpen => !dappConnectorStillOpen),
    take(1),
  );

/**
 * Opens a DApp connector sheet in the side panel or falls back to popupWindow.
 * When side panel is open, dispatches setActiveSheetPage to open the sheet.
 * When closed, falls back to opening a popupWindow at the given location.
 */
/**
 * Finds the side panel view for a specific browser window, or any side panel
 * if no windowId is provided.
 */
export const findTargetSidePanel = (openViews: View[], windowId?: number) => {
  if (windowId !== undefined) {
    return openViews.find(
      v => v.type === 'sidePanel' && v.windowId === windowId,
    );
  }
  return openViews.find(v => v.type === 'sidePanel');
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

/**
 * Creates DApp icon data for sheet navigation params.
 */
const toDappSheetIcon = (imageUrl?: string) => ({
  type: 'uri' as const,
  uri: imageUrl ?? '',
});

/**
 * Handles the transaction signing (signTx) flow for the extension.
 */
export const signTx$ = ({
  request,
  selectOpenViews$,
  actions,
  confirmSignTx$,
  rejectSignTx$,
  viewDisconnected$,
  signingResult$,
}: SignTxParams) => {
  const { requestingDapp } = request;
  const requestId = `${requestingDapp.origin}-signTx-${Date.now()}`;

  return merge(
    openDappSheet(actions, selectOpenViews$, {
      sheetRoute: 'SignTx',
      sheetParams: {
        requestId,
        dapp: {
          icon: toDappSheetIcon(requestingDapp.imageUrl),
          name: requestingDapp.name,
          origin: requestingDapp.origin,
        },
        txHex: request.txHex ?? '',
        partialSign: request.partialSign ?? false,
      },
      popupWindowLocation: CARDANO_DAPP_SIGN_TX_LOCATION,
      windowId: request.windowId,
    }),
    of(
      actions.cardanoDappConnector.setPendingSignTxRequest({
        requestId,
        dappOrigin: requestingDapp.origin,
        dapp: {
          name: requestingDapp.name,
          origin: requestingDapp.origin,
          imageUrl: requestingDapp.imageUrl || undefined,
        },
        txHex: request.txHex ?? '',
        partialSign: request.partialSign ?? false,
      }),
    ),
    selectOpenViews$.pipe(
      take(1),
      switchMap(openViews => {
        const sidePanel = findTargetSidePanel(openViews, request.windowId);
        if (sidePanel) {
          // Sheet mode: wait for confirm/reject or panel closure
          return race(
            race(
              confirmSignTx$.pipe(
                take(1),
                tap(() => {
                  request.resolve({ isConfirmed: true });
                }),
                switchMap(() => signingResult$.pipe(take(1))),
              ),
              rejectSignTx$.pipe(
                take(1),
                tap(() => {
                  request.resolve({ isConfirmed: false });
                }),
                map(() => ({ type: 'rejected' as const })),
              ),
            ).pipe(
              switchMap(result => {
                if (result.type === 'success') {
                  return [
                    actions.cardanoDappConnector.setSignTxCompleted(true),
                    actions.cardanoDappConnector.clearPendingSignTxRequest(),
                  ];
                }
                if (result.type === 'cancelled') {
                  return [
                    actions.views.setActiveSheetPage(null),
                    actions.cardanoDappConnector.clearPendingSignTxRequest(),
                  ];
                }
                if (result.type === 'error') {
                  return [
                    actions.cardanoDappConnector.setSignTxError(true),
                    ...(result.hwErrorKeys
                      ? [
                          actions.cardanoDappConnector.setSignTxHwErrorKeys(
                            result.hwErrorKeys,
                          ),
                        ]
                      : []),
                    actions.cardanoDappConnector.clearPendingSignTxRequest(),
                  ];
                }
                // rejected
                return [
                  actions.cardanoDappConnector.clearPendingSignTxRequest(),
                ];
              }),
            ),
            viewDisconnected$.pipe(
              filter(({ payload }) => payload === sidePanel.id),
              take(1),
              tap(() => {
                request.resolve({ isConfirmed: false });
              }),
              switchMap(() => [
                actions.views.setActiveSheetPage(null),
                actions.cardanoDappConnector.clearPendingSignTxRequest(),
              ]),
            ),
          );
        }
        // PopupWindow mode: existing location-based flow
        return selectOpenViews$.pipe(
          map(views =>
            views.find(view => view.location === CARDANO_DAPP_SIGN_TX_LOCATION),
          ),
          filter(Boolean),
          take(1),
          switchMap(dappConnectorView =>
            race(
              race(
                confirmSignTx$.pipe(
                  take(1),
                  tap(() => {
                    request.resolve({ isConfirmed: true });
                  }),
                  switchMap(() => signingResult$.pipe(take(1))),
                ),
                rejectSignTx$.pipe(
                  take(1),
                  tap(() => {
                    request.resolve({ isConfirmed: false });
                  }),
                  map(() => ({ type: 'rejected' as const })),
                ),
              ).pipe(
                switchMap(result => {
                  if (result.type === 'success') {
                    return [
                      actions.cardanoDappConnector.setSignTxCompleted(true),
                      actions.cardanoDappConnector.clearPendingSignTxRequest(),
                    ];
                  }
                  if (result.type === 'cancelled') {
                    return [
                      actions.views.closeView(dappConnectorView.id),
                      actions.cardanoDappConnector.clearPendingSignTxRequest(),
                    ];
                  }
                  if (result.type === 'error') {
                    return [
                      actions.cardanoDappConnector.setSignTxError(true),
                      ...(result.hwErrorKeys
                        ? [
                            actions.cardanoDappConnector.setSignTxHwErrorKeys(
                              result.hwErrorKeys,
                            ),
                          ]
                        : []),
                      actions.cardanoDappConnector.clearPendingSignTxRequest(),
                    ];
                  }
                  // rejected
                  return [
                    actions.cardanoDappConnector.clearPendingSignTxRequest(),
                  ];
                }),
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
                map(() =>
                  actions.cardanoDappConnector.clearPendingSignTxRequest(),
                ),
              ),
            ),
          ),
        );
      }),
    ),
  );
};

/**
 * Handles the data signing (signData) flow for the extension.
 */
export const signData$ = ({
  request,
  selectOpenViews$,
  actions,
  confirmSignData$,
  rejectSignData$,
  viewDisconnected$,
  signingResult$,
}: SignDataParams) => {
  const { requestingDapp } = request;
  const requestId = `${requestingDapp.origin}-signData-${Date.now()}`;

  return merge(
    openDappSheet(actions, selectOpenViews$, {
      sheetRoute: 'SignData',
      sheetParams: {
        requestId,
        dapp: {
          icon: toDappSheetIcon(requestingDapp.imageUrl),
          name: requestingDapp.name,
          origin: requestingDapp.origin,
        },
        address: request.signDataAddress ?? '',
        payload: request.signDataPayload ?? '',
      },
      popupWindowLocation: CARDANO_DAPP_SIGN_DATA_LOCATION,
      windowId: request.windowId,
    }),
    of(
      actions.cardanoDappConnector.setPendingSignDataRequest({
        requestId,
        dappOrigin: requestingDapp.origin,
        dapp: {
          name: requestingDapp.name,
          origin: requestingDapp.origin,
          imageUrl: requestingDapp.imageUrl || undefined,
        },
        address: request.signDataAddress ?? '',
        payload: request.signDataPayload ?? '',
      }),
    ),
    selectOpenViews$.pipe(
      take(1),
      switchMap(openViews => {
        const sidePanel = findTargetSidePanel(openViews, request.windowId);
        if (sidePanel) {
          // Sheet mode: wait for confirm/reject or panel closure
          return race(
            race(
              confirmSignData$.pipe(
                take(1),
                tap(() => {
                  request.resolve({ isConfirmed: true });
                }),
                switchMap(() => signingResult$.pipe(take(1))),
              ),
              rejectSignData$.pipe(
                take(1),
                tap(() => {
                  request.resolve({ isConfirmed: false });
                }),
                map(() => ({ type: 'rejected' as const })),
              ),
            ).pipe(
              switchMap(result => {
                if (result.type === 'success') {
                  return [
                    actions.cardanoDappConnector.setSignDataCompleted(true),
                    actions.cardanoDappConnector.clearPendingSignDataRequest(),
                  ];
                }
                if (result.type === 'cancelled') {
                  return [
                    actions.views.setActiveSheetPage(null),
                    actions.cardanoDappConnector.clearPendingSignDataRequest(),
                  ];
                }
                if (result.type === 'error') {
                  return [
                    actions.cardanoDappConnector.setSignDataError(true),
                    ...(result.hwErrorKeys
                      ? [
                          actions.cardanoDappConnector.setSignDataHwErrorKeys(
                            result.hwErrorKeys,
                          ),
                        ]
                      : []),
                    actions.cardanoDappConnector.clearPendingSignDataRequest(),
                  ];
                }
                // rejected
                return [
                  actions.cardanoDappConnector.clearPendingSignDataRequest(),
                ];
              }),
            ),
            viewDisconnected$.pipe(
              filter(({ payload }) => payload === sidePanel.id),
              take(1),
              tap(() => {
                request.resolve({ isConfirmed: false });
              }),
              switchMap(() => [
                actions.views.setActiveSheetPage(null),
                actions.cardanoDappConnector.clearPendingSignDataRequest(),
              ]),
            ),
          );
        }
        // PopupWindow mode: existing location-based flow
        return selectOpenViews$.pipe(
          map(views =>
            views.find(
              view => view.location === CARDANO_DAPP_SIGN_DATA_LOCATION,
            ),
          ),
          filter(Boolean),
          take(1),
          switchMap(dappConnectorView =>
            race(
              race(
                confirmSignData$.pipe(
                  take(1),
                  tap(() => {
                    request.resolve({ isConfirmed: true });
                  }),
                  switchMap(() => signingResult$.pipe(take(1))),
                ),
                rejectSignData$.pipe(
                  take(1),
                  tap(() => {
                    request.resolve({ isConfirmed: false });
                  }),
                  map(() => ({ type: 'rejected' as const })),
                ),
              ).pipe(
                switchMap(result => {
                  if (result.type === 'success') {
                    return [
                      actions.cardanoDappConnector.setSignDataCompleted(true),
                      actions.cardanoDappConnector.clearPendingSignDataRequest(),
                    ];
                  }
                  if (result.type === 'cancelled') {
                    return [
                      actions.views.closeView(dappConnectorView.id),
                      actions.cardanoDappConnector.clearPendingSignDataRequest(),
                    ];
                  }
                  if (result.type === 'error') {
                    return [
                      actions.cardanoDappConnector.setSignDataError(true),
                      ...(result.hwErrorKeys
                        ? [
                            actions.cardanoDappConnector.setSignDataHwErrorKeys(
                              result.hwErrorKeys,
                            ),
                          ]
                        : []),
                      actions.cardanoDappConnector.clearPendingSignDataRequest(),
                    ];
                  }
                  // rejected
                  return [
                    actions.cardanoDappConnector.clearPendingSignDataRequest(),
                  ];
                }),
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
                map(() =>
                  actions.cardanoDappConnector.clearPendingSignDataRequest(),
                ),
              ),
            ),
          ),
        );
      }),
    ),
  );
};
