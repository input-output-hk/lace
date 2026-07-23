import { encodeToParts } from '@lace-lib/ur-transport';
import { HexBytes } from '@lace-lib/util';
import {
  EMPTY,
  NEVER,
  catchError,
  concat,
  defer,
  filter,
  ignoreElements,
  tap,
  map,
  merge,
  concatMap,
  mergeMap,
  of,
  race,
  switchMap,
  take,
} from 'rxjs';

import {
  matchesExpectedResponseType,
  AirGappedQrExchangeCancelledError,
} from '../types';

import {
  airGappedQrExchangeAborts$,
  airGappedQrExchangeRequests$,
} from './request';

import type { AirGappedQrExchangeRequest } from './request';
import type { PendingAirGappedQrExchange } from './slice';
import type { SideEffect } from '../contract';

/** Frames per second for the animated request QR. Slow enough for an air-gapped camera to capture each frame. */
const REQUEST_QR_FPS = 5;
/** Bytes per QR fragment. Smaller than the firmware max so each frame's modules are larger and easier to scan. */
const REQUEST_QR_MAX_FRAGMENT_LENGTH = 60;
/** Emit twice the pure fragments as fountain parts so the looping QR reassembles despite dropped frames. */
const REQUEST_QR_REDUNDANCY_RATIO = 2;

const requestToFrames = (
  options: AirGappedQrExchangeRequest['options'],
): string[] => {
  const request = options.request;
  return 'frames' in request && request.frames
    ? request.frames
    : encodeToParts(request.urType, request.cbor, {
        maxFragmentLength: REQUEST_QR_MAX_FRAGMENT_LENGTH,
        redundancyRatio: REQUEST_QR_REDUNDANCY_RATIO,
      });
};

const toPending = ({
  requestId,
  options,
}: AirGappedQrExchangeRequest): PendingAirGappedQrExchange => ({
  requestId,
  frames: requestToFrames(options),
  expectedResponseType:
    typeof options.expectedResponseType === 'string'
      ? options.expectedResponseType
      : [...options.expectedResponseType],
  fps: options.fps ?? REQUEST_QR_FPS,
  titleKey: options.titleKey,
  instructionKey: options.instructionKey,
  requestInstructionKey: options.requestInstructionKey,
  detail: options.detail,
  chainType: options.chainType,
});

/**
 * Platform wiring for surfacing the exchange view. Extension opens a
 * camera-capable connected tab at `scannerLocation` and treats that tab going
 * away as a cancel; mobile relies on the always-mounted overlay (no dedicated
 * view to open or watch).
 */
export interface ExchangeViewConfig {
  /** True on the extension (the camera scan needs a tab). */
  readonly opensScannerTab: boolean;
  /** Connected-view location the scanner tab is opened at. */
  readonly scannerLocation: string;
}

/**
 * SW side effect bridging the QR-exchange trigger to the view via redux, the
 * same shape as the authentication prompt: on each trigger it writes pending
 * state (requested), surfaces the view, then awaits the view-dispatched terminal
 * action -- scanCompleted resolves the trigger Observable (hex -> bytes),
 * cancelled/failed/scanner-view-disconnect error it. Every terminal reducer
 * clears the pending state whose requestId it carries, so the spinner never
 * wedges and stale terminal actions cannot clear a newer exchange.
 *
 * Triggers are serialized (concatMap): a new exchange starts only after the
 * previous one settles, so the single pending slot is never overwritten while
 * an exchange is in flight and scans cannot be attributed to the wrong caller.
 */
export const makeAirGappedQrExchangeSideEffect =
  ({ opensScannerTab, scannerLocation }: ExchangeViewConfig): SideEffect =>
  (
    {
      airGappedQrExchange: { scanCompleted$, cancelled$, failed$ },
      views: { viewDisconnected$ },
    },
    { views: { selectOpenViews$ } },
    { actions },
  ) => {
    const abortedWhileQueued = new Set<string>();

    const closeScannerTabFor$ = () =>
      opensScannerTab
        ? selectOpenViews$.pipe(
            take(1),
            mergeMap(openViews => {
              const scannerView = openViews.find(
                view => view.location === scannerLocation,
              );
              return scannerView
                ? of(actions.views.closeView(scannerView.id))
                : EMPTY;
            }),
          )
        : EMPTY;

    return merge(
      airGappedQrExchangeAborts$.pipe(
        tap(requestId => abortedWhileQueued.add(requestId)),
        ignoreElements(),
      ),
      airGappedQrExchangeRequests$.pipe(
        concatMap(request => {
          const closeScannerTab$ = closeScannerTabFor$();
          return defer(() => {
            if (abortedWhileQueued.delete(request.requestId)) {
              return EMPTY;
            }
            const { requestId, result$ } = request;
            const expectedResponseType = request.options.expectedResponseType;

            const open$ = opensScannerTab
              ? of(
                  actions.views.openView({
                    type: 'tab',
                    location: scannerLocation,
                  }),
                )
              : EMPTY;

            // The views reducer removes the view from state before viewDisconnected
            // reaches side effects, so the scanner view id must be captured while
            // the view is still open and matched against the disconnect payload.
            const scannerDisconnected$ = opensScannerTab
              ? selectOpenViews$.pipe(
                  map(
                    openViews =>
                      openViews.find(view => view.location === scannerLocation)
                        ?.id,
                  ),
                  filter(id => id !== undefined),
                  take(1),
                  switchMap(scannerViewId =>
                    viewDisconnected$.pipe(
                      filter(
                        ({ payload }) =>
                          String(payload) === String(scannerViewId),
                      ),
                    ),
                  ),
                )
              : NEVER;

            // Close the scanner tab on a terminal outcome where the tab is still
            // open (scan/cancel/fail). On disconnect the tab is already gone.

            // Each branch takes exactly one matching action before projecting, so
            // the branch completes even when closeScannerTab$ is EMPTY (mobile).
            // The race is not capped to a single emission: the winning branch may
            // emit a terminal action followed by the tab close.
            const settle$ = race(
              scanCompleted$.pipe(
                filter(
                  ({ payload }) =>
                    payload.requestId === requestId &&
                    matchesExpectedResponseType(
                      expectedResponseType,
                      payload.urType,
                    ),
                ),
                take(1),
                mergeMap(({ payload }) => {
                  result$.next({
                    urType: payload.urType,
                    cbor: HexBytes.toByteArray(HexBytes(payload.cborHex)),
                  });
                  result$.complete();
                  return closeScannerTab$;
                }),
              ),
              cancelled$.pipe(
                filter(({ payload }) => payload.requestId === requestId),
                take(1),
                mergeMap(() => {
                  result$.error(new AirGappedQrExchangeCancelledError());
                  return closeScannerTab$;
                }),
              ),
              failed$.pipe(
                filter(({ payload }) => payload.requestId === requestId),
                take(1),
                mergeMap(({ payload }) => {
                  result$.error(new Error(payload.message));
                  return closeScannerTab$;
                }),
              ),
              scannerDisconnected$.pipe(
                take(1),
                mergeMap(() => {
                  result$.error(new AirGappedQrExchangeCancelledError());
                  return of(
                    actions.airGappedQrExchange.cancelled({ requestId }),
                  );
                }),
              ),
              airGappedQrExchangeAborts$.pipe(
                filter(abortedRequestId => abortedRequestId === requestId),
                take(1),
                mergeMap(() => {
                  abortedWhileQueued.delete(requestId);
                  return concat(
                    of(actions.airGappedQrExchange.cancelled({ requestId })),
                    closeScannerTab$,
                  );
                }),
              ),
            );

            return concat(
              merge(
                of(actions.airGappedQrExchange.requested(toPending(request))),
                open$,
              ),
              settle$,
            );
          }).pipe(
            catchError((error: unknown) => {
              const failure =
                error instanceof Error ? error : new Error(String(error));
              request.result$.error(failure);
              return concat(
                of(
                  actions.airGappedQrExchange.failed({
                    requestId: request.requestId,
                    message: failure.message,
                  }),
                ),
                closeScannerTab$,
              );
            }),
          );
        }),
      ),
    );
  };
