import { isSidePanelApiAvailable } from '@lace-contract/views';
import {
  defer,
  EMPTY,
  filter,
  map,
  merge,
  NEVER,
  of,
  race,
  switchMap,
  take,
  tap,
  timer,
} from 'rxjs';

import { COLLATERAL_BLOCK_LOG } from '../../common/store/dependencies/cardano-dapp-connector-api';
import {
  CARDANO_DAPP_SIGN_DATA_LOCATION,
  CARDANO_DAPP_SIGN_TX_LOCATION,
} from '../const';

import type { CollateralBlockStage } from '../../common/store/dependencies/cardano-dapp-connector-api';
import type { SigningResult } from '../../common/store/dependencies/cardano-dapp-connector-api';
import type { CardanoConfirmationRequest } from '../../common/store/dependencies/create-confirmation-callback';
import type { SignRequestAnswer } from '../../common/store/slice';
import type { ActionCreators } from '../../index';
import type { CollateralOwnershipErrorCase } from '@lace-contract/cardano-context';
import type { ViewId } from '@lace-contract/module';
import type { View } from '@lace-contract/views';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';

export type { SigningResult };

type SignAnswerAction = { payload: SignRequestAnswer };

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
  /** Diagnostics sink; only the refused path writes to it */
  logger?: Logger;
  /** Observable that emits when user confirms transaction */
  confirmSignTx$: Observable<SignAnswerAction>;
  /** Observable that emits when user rejects transaction */
  rejectSignTx$: Observable<SignAnswerAction>;
  /** Observable that emits when a view disconnects (popup closed) */
  viewDisconnected$: Observable<{ payload: ViewId }>;
  /** Observable that signals signing completion from the wrapper */
  signingResult$: Observable<SigningResult>;
};

/**
 * Parameters for the refused-signTx disclosure utility function.
 */
export type RefusedSignTxParams = SharedParams & {
  /** The confirmation request from the dApp */
  request: CardanoConfirmationRequest;
  /** The collateral guard's block verdict this screen explains */
  collateralRefusal: CollateralOwnershipErrorCase;
  /** Diagnostics sink; records that the screen actually got presented */
  logger?: Logger;
  /** Observable that emits when the user dismisses the refused screen */
  rejectSignTx$: Observable<SignAnswerAction>;
  /** Observable that emits when a view disconnects (popup/panel closed) */
  viewDisconnected$: Observable<{ payload: ViewId }>;
};

/**
 * Parameters for the signData flow utility function.
 */
export type SignDataParams = SharedParams & {
  /** The confirmation request from the dApp */
  request: CardanoConfirmationRequest;
  /** Observable that emits when user confirms data signing */
  confirmSignData$: Observable<SignAnswerAction>;
  /** Observable that emits when user rejects data signing */
  rejectSignData$: Observable<SignAnswerAction>;
  /** Observable that emits when a view disconnects (popup closed) */
  viewDisconnected$: Observable<{ payload: ViewId }>;
  /** Observable that signals signing completion from the API */
  signingResult$: Observable<SigningResult>;
};

/**
 * How long the popup window gets to register in `openViews` before the request
 * is failed.
 *
 * Waiting for registration without a bound parks the request on a prompt that
 * may never appear — nothing else in the flow can settle it, because the
 * confirm and reject signals come from the very view that never opened. Since
 * requests are served one at a time, such a request wedges every later one
 * behind it as well.
 */
const POPUP_REGISTRATION_CAP_MS = 15_000;

/**
 * Waits for the popup at `location` to register, giving up after
 * {@link POPUP_REGISTRATION_CAP_MS}.
 *
 * Emits the view once it registers, or `undefined` on expiry. The cap covers
 * registration ONLY — once the view is found the caller waits on the user for
 * as long as it takes, so a slow reader is never timed out mid-decision.
 */
const awaitPopupRegistration = (
  selectOpenViews$: Observable<View[]>,
  location: string,
): Observable<View | undefined> =>
  race(
    selectOpenViews$.pipe(
      map(views => views.find(view => view.location === location)),
      filter(Boolean),
      take(1),
    ),
    timer(POPUP_REGISTRATION_CAP_MS).pipe(map(() => undefined)),
  );

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
  // Some chromium browsers (e.g. Yandex) do not implement chrome.sidePanel.
  // In that case there can never be a side panel view to target, and the dapp
  // connector must fall back to opening a popup window.
  if (!isSidePanelApiAvailable()) return undefined;
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
 * Identifies one signing request for its whole life.
 *
 * The sequence number is what makes the id unique: `Date.now()` alone repeats
 * for two requests stamped in the same millisecond, and `closeRequestedPopup`
 * tells a queued request apart from the one whose window it inherited by this
 * id — so a repeat would let a close cross over between them.
 */
const createRequestIdFactory = () => {
  let sequence = 0;
  return (origin: string, type: string): string => {
    sequence += 1;
    return `${origin}-${type}-${Date.now()}-${sequence}`;
  };
};

const nextRequestId = createRequestIdFactory();

/**
 * Matches a confirm or reject against the request it answers.
 *
 * An answer that names no request comes from a view that never synced one, and
 * is applied to the request at the head: nothing else observes a sheet being
 * dismissed while its panel stays open, so dropping such an answer would leave
 * that request — and every request queued behind it — unsettled.
 */
const isAnswerTo =
  (requestId: string) =>
  ({ payload }: SignAnswerAction): boolean =>
    payload.requestId === undefined || payload.requestId === requestId;

/**
 * Opens the signTx surface and publishes the pending request. Shared by the
 * consent flow and the refused disclosure: the two differ in what they WAIT
 * for, never in what they open. `collateralRefusal` is the block verdict for
 * the refused surface and `null` for a reviewable request.
 */
const openSignTxSurface$ = ({
  actions,
  selectOpenViews$,
  request,
  requestId,
  collateralRefusal,
}: SharedParams & {
  request: CardanoConfirmationRequest;
  requestId: string;
  collateralRefusal: CollateralOwnershipErrorCase | null;
}) => {
  const { requestingDapp } = request;
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
        // Required (not optional) on `PendingSignTxRequest`, so a verdict
        // dropped on this hop is a compile error, not a live Sign button on a
        // refused transaction. BOTH render modes read it from the slice --
        // never from the sheet params above, which `sheetPages.tsx` discards.
        collateralRefusal,
      }),
    ),
  );
};

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
  logger,
}: SignTxParams) => {
  // A request the collateral-ownership guard blocked has already been
  // rejected to the dApp and is NOT consent -- it is shown to explain the
  // refusal. Dispatched here, at the single signTx surface seam, so it
  // inherits the caller's request serialisation unchanged. Truthiness, not
  // `!== null`: the verdict is a non-empty token or null, and a request built
  // without the field must read as reviewable, never as refused.
  if (request.collateralRefusal) {
    return refusedSignTx$({
      request,
      collateralRefusal: request.collateralRefusal,
      selectOpenViews$,
      actions,
      rejectSignTx$,
      viewDisconnected$,
      logger,
    });
  }

  const { requestingDapp } = request;
  const requestId = nextRequestId(requestingDapp.origin, 'signTx');

  // Once the user confirms, the signing result is the flow's only terminal
  // event. Signing runs outside this pipeline and can take minutes on a
  // hardware wallet, and the confirm arm does not emit until its result
  // arrives — so without this guard a view closure, a port drop or a late
  // Cancel in that window would win the race, complete the flow, and let
  // the NEXT queued request consume this request's signing result and
  // report it as its own.
  // `filter`, not `takeUntil`: takeUntil would complete this arm and so end
  // the race. `filter` suppresses the value only — a source that COMPLETES
  // still ends it, so the drop signal is kept open (see its own comment).
  let hasConfirmed = false;

  // A port drop (e.g. a bfcache freeze) would otherwise leave the confirmation
  // pending forever. Flips the sheet to error like a signing failure, but with
  // no hw-error keys — the connection dropped, the signer never ran.
  const disconnected$ = (request.disconnected$ ?? NEVER).pipe(
    filter(() => !hasConfirmed),
    take(1),
    tap(() => {
      request.resolve({ outcome: 'disconnected' });
    }),
    switchMap(() => [
      actions.cardanoDappConnector.setSignTxError(true),
      actions.cardanoDappConnector.clearPendingSignTxRequest(),
    ]),
  );

  return merge(
    openSignTxSurface$({
      actions,
      selectOpenViews$,
      request,
      requestId,
      collateralRefusal: request.collateralRefusal,
    }),
    selectOpenViews$.pipe(
      take(1),
      switchMap(openViews => {
        const sidePanel = findTargetSidePanel(openViews, request.windowId);
        if (sidePanel) {
          // Sheet mode: wait for confirm/reject or panel closure
          return race(
            race(
              confirmSignTx$.pipe(
                filter(isAnswerTo(requestId)),
                take(1),
                tap(() => {
                  hasConfirmed = true;
                  request.resolve({ outcome: 'confirmed' });
                }),
                switchMap(() => signingResult$.pipe(take(1))),
              ),
              rejectSignTx$.pipe(
                filter(isAnswerTo(requestId)),
                filter(() => !hasConfirmed),
                take(1),
                tap(() => {
                  request.resolve({ outcome: 'rejected' });
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
              filter(() => !hasConfirmed),
              take(1),
              tap(() => {
                request.resolve({ outcome: 'rejected' });
              }),
              switchMap(() => [
                actions.views.setActiveSheetPage(null),
                actions.cardanoDappConnector.clearPendingSignTxRequest(),
              ]),
            ),
            disconnected$,
          );
        }
        // PopupWindow mode: existing location-based flow
        return race(
          // Raced against the view-wait, not nested in it: a drop before the
          // popup registers is still caught, and the view-wait arm emits only on
          // confirm/reject/close, so a completed sign still tears this arm down.
          disconnected$,
          awaitPopupRegistration(
            selectOpenViews$,
            CARDANO_DAPP_SIGN_TX_LOCATION,
          ).pipe(
            switchMap(dappConnectorView => {
              if (!dappConnectorView) {
                // The prompt never appeared, so the user cannot answer it.
                // Settle the dApp and free the queue rather than parking here.
                request.resolve({ outcome: 'unavailable' });
                // The error flag matters even though no view registered: one
                // may still mount late, and without it that window would
                // render the loading state forever on a settled request.
                return [
                  actions.cardanoDappConnector.setSignTxError(true),
                  actions.cardanoDappConnector.clearPendingSignTxRequest(),
                ];
              }
              return race(
                race(
                  confirmSignTx$.pipe(
                    filter(isAnswerTo(requestId)),
                    take(1),
                    tap(() => {
                      hasConfirmed = true;
                      request.resolve({ outcome: 'confirmed' });
                    }),
                    switchMap(() => signingResult$.pipe(take(1))),
                  ),
                  rejectSignTx$.pipe(
                    filter(isAnswerTo(requestId)),
                    filter(() => !hasConfirmed),
                    take(1),
                    tap(() => {
                      request.resolve({ outcome: 'rejected' });
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
                        // Asking to close, rather than closing outright: a
                        // queued request binds to this same window the instant
                        // this flow completes, and `closeRequestedPopup` is
                        // what knows whether that has happened by the time the
                        // close lands.
                        actions.cardanoDappConnector.closePopupRequested({
                          location: CARDANO_DAPP_SIGN_TX_LOCATION,
                          requestId,
                        }),
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
                  filter(() => !hasConfirmed),
                  take(1),
                  tap(() => {
                    request.resolve({ outcome: 'rejected' });
                  }),
                  map(() =>
                    actions.cardanoDappConnector.clearPendingSignTxRequest(),
                  ),
                ),
              );
            }),
          ),
        );
      }),
    ),
  );
};

/**
 * Presents the REFUSED state of the signTx consent surface for a request the
 * collateral-ownership guard blocked.
 *
 * Not `signTx$` with a flag, because the two differ in what they wait for:
 *  - the CIP-30 rejection has ALREADY been sent by `signTx`, immediately and
 *    unconditionally. So this flow settles `request.resolve` at once and
 *    never subscribes `confirmSignTx$` at all: there is no consent outcome
 *    left to observe, no `outcome === 'confirmed'` branch, and no path from
 *    this screen to a signature;
 *  - it nevertheless stays alive until the screen is gone, exactly like a
 *    real consent flow. The caller serialises consent requests, and holding
 *    the slot is what makes the refused screen non-preemptable: a follow-up
 *    signTx from the same clocked attacker waits behind it instead of
 *    repainting it away (single pending slot + an already-open popup that is
 *    merely focused).
 *
 * Ends -- releasing the slot and clearing the pending request -- on the
 * user's dismissal, on the surface disappearing underneath it, or when the
 * popup never registers at all (the same cap `signTx$` applies, so a screen
 * that cannot appear does not wedge every request queued behind it).
 */
export const refusedSignTx$ = ({
  request,
  collateralRefusal,
  selectOpenViews$,
  actions,
  rejectSignTx$,
  viewDisconnected$,
  logger,
}: RefusedSignTxParams) => {
  const { requestingDapp } = request;
  const requestId = nextRequestId(requestingDapp.origin, 'signTx');

  return merge(
    // On subscription, not at assembly: every other builder here settles the
    // request inside the stream, and the log below claims the disclosure
    // reached presentation -- which is only true once something subscribes.
    defer(() => {
      request.resolve({ outcome: 'rejected' });
      // The API side logs that it REQUESTED the disclosure; this logs that it
      // survived to presentation. The pair is what makes a delayed or missing
      // disclosure (a dApp parks the consent slot ahead of it) visible: a
      // blocked request with no line here was refused without the user
      // being told yet.
      logger?.warn(COLLATERAL_BLOCK_LOG, {
        stage: 'screen-presented' satisfies CollateralBlockStage,
        origin: requestingDapp.origin,
        case: collateralRefusal,
        requestId,
      });
      return EMPTY;
    }),
    openSignTxSurface$({
      actions,
      selectOpenViews$,
      request,
      requestId,
      collateralRefusal,
    }),
    selectOpenViews$.pipe(
      take(1),
      switchMap(openViews => {
        const sidePanel = findTargetSidePanel(openViews, request.windowId);
        if (sidePanel) {
          return race(
            rejectSignTx$.pipe(
              filter(isAnswerTo(requestId)),
              take(1),
              switchMap(() => [
                actions.cardanoDappConnector.clearPendingSignTxRequest(),
              ]),
            ),
            viewDisconnected$.pipe(
              filter(({ payload }) => payload === sidePanel.id),
              take(1),
              switchMap(() => [
                actions.views.setActiveSheetPage(null),
                actions.cardanoDappConnector.clearPendingSignTxRequest(),
              ]),
            ),
          );
        }
        // PopupWindow mode: the same capped registration wait as `signTx$`.
        return awaitPopupRegistration(
          selectOpenViews$,
          CARDANO_DAPP_SIGN_TX_LOCATION,
        ).pipe(
          switchMap(dappConnectorView => {
            if (!dappConnectorView) {
              // The screen never appeared. The dApp was already answered, so
              // only the queue is at stake: release it.
              return [actions.cardanoDappConnector.clearPendingSignTxRequest()];
            }
            return race(
              rejectSignTx$.pipe(filter(isAnswerTo(requestId)), take(1)),
              merge(
                viewDisconnected$.pipe(
                  filter(({ payload }) => payload === dappConnectorView.id),
                ),
                detectViewClosure({ dappConnectorView, selectOpenViews$ }),
              ).pipe(take(1)),
            ).pipe(
              map(() =>
                actions.cardanoDappConnector.clearPendingSignTxRequest(),
              ),
            );
          }),
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
  const requestId = nextRequestId(requestingDapp.origin, 'signData');

  // Once the user confirms, the signing result is the flow's only terminal
  // event. Signing runs outside this pipeline and can take minutes on a
  // hardware wallet, and the confirm arm does not emit until its result
  // arrives — so without this guard a view closure, a port drop or a late
  // Cancel in that window would win the race, complete the flow, and let
  // the NEXT queued request consume this request's signing result and
  // report it as its own.
  // `filter`, not `takeUntil`: takeUntil would complete this arm and so end
  // the race. `filter` suppresses the value only — a source that COMPLETES
  // still ends it, so the drop signal is kept open (see its own comment).
  let hasConfirmed = false;

  // A port drop (e.g. a bfcache freeze) would otherwise leave the confirmation
  // pending forever. Flips the sheet to error like a signing failure, but with
  // no hw-error keys — the connection dropped, the signer never ran.
  const disconnected$ = (request.disconnected$ ?? NEVER).pipe(
    filter(() => !hasConfirmed),
    take(1),
    tap(() => {
      request.resolve({ outcome: 'disconnected' });
    }),
    switchMap(() => [
      actions.cardanoDappConnector.setSignDataError(true),
      actions.cardanoDappConnector.clearPendingSignDataRequest(),
    ]),
  );

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
                filter(isAnswerTo(requestId)),
                take(1),
                tap(() => {
                  hasConfirmed = true;
                  request.resolve({ outcome: 'confirmed' });
                }),
                switchMap(() => signingResult$.pipe(take(1))),
              ),
              rejectSignData$.pipe(
                filter(isAnswerTo(requestId)),
                filter(() => !hasConfirmed),
                take(1),
                tap(() => {
                  request.resolve({ outcome: 'rejected' });
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
              filter(() => !hasConfirmed),
              take(1),
              tap(() => {
                request.resolve({ outcome: 'rejected' });
              }),
              switchMap(() => [
                actions.views.setActiveSheetPage(null),
                actions.cardanoDappConnector.clearPendingSignDataRequest(),
              ]),
            ),
            disconnected$,
          );
        }
        // PopupWindow mode: existing location-based flow
        return race(
          // Raced against the view-wait, not nested in it: a drop before the
          // popup registers is still caught, and the view-wait arm emits only on
          // confirm/reject/close, so a completed sign still tears this arm down.
          disconnected$,
          awaitPopupRegistration(
            selectOpenViews$,
            CARDANO_DAPP_SIGN_DATA_LOCATION,
          ).pipe(
            switchMap(dappConnectorView => {
              if (!dappConnectorView) {
                // The prompt never appeared, so the user cannot answer it.
                // Settle the dApp and free the queue rather than parking here.
                request.resolve({ outcome: 'unavailable' });
                // The error flag matters even though no view registered: one
                // may still mount late, and without it that window would
                // render the loading state forever on a settled request.
                return [
                  actions.cardanoDappConnector.setSignDataError(true),
                  actions.cardanoDappConnector.clearPendingSignDataRequest(),
                ];
              }
              return race(
                race(
                  confirmSignData$.pipe(
                    filter(isAnswerTo(requestId)),
                    take(1),
                    tap(() => {
                      hasConfirmed = true;
                      request.resolve({ outcome: 'confirmed' });
                    }),
                    switchMap(() => signingResult$.pipe(take(1))),
                  ),
                  rejectSignData$.pipe(
                    filter(isAnswerTo(requestId)),
                    filter(() => !hasConfirmed),
                    take(1),
                    tap(() => {
                      request.resolve({ outcome: 'rejected' });
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
                        // Asking to close, rather than closing outright: a
                        // queued request binds to this same window the instant
                        // this flow completes, and `closeRequestedPopup` is
                        // what knows whether that has happened by the time the
                        // close lands.
                        actions.cardanoDappConnector.closePopupRequested({
                          location: CARDANO_DAPP_SIGN_DATA_LOCATION,
                          requestId,
                        }),
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
                  filter(() => !hasConfirmed),
                  take(1),
                  tap(() => {
                    request.resolve({ outcome: 'rejected' });
                  }),
                  map(() =>
                    actions.cardanoDappConnector.clearPendingSignDataRequest(),
                  ),
                ),
              );
            }),
          ),
        );
      }),
    ),
  );
};
