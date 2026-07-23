import { Observable, Subject, take } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import type { AirGappedQrExchange, AirGappedQrExchangeResult } from '../types';

/** A single in-flight exchange the SW side effect fulfils. */
export interface AirGappedQrExchangeRequest {
  /** Stable id correlating the request with its view-dispatched result. */
  requestId: string;
  /** The exchange options the caller passed to {@link airGappedQrExchangeHook}. */
  options: Parameters<AirGappedQrExchange>[0];
  /** Resolved (next + complete) or errored once by the SW side effect. */
  result$: Subject<AirGappedQrExchangeResult>;
}

/**
 * SW-local glue between the {@link airGappedQrExchangeHook} callers (signer,
 * connector) and the SW side effect that bridges to the view via redux state +
 * actions. Mirrors authenticateRequests$ in the authentication prompt: the
 * trigger pushes a request here, the side effect dispatches `requested` (pending
 * redux state) and later resolves result$ from the view-dispatched result
 * action. The SW<->view crossing is redux, not this subject.
 */
export const airGappedQrExchangeRequests$ =
  new Subject<AirGappedQrExchangeRequest>();

/**
 * Request ids whose trigger subscription was torn down before the exchange
 * settled. The SW side effect treats an abort like a cancel: it clears the
 * pending state and closes the scanner, so an abandoned exchange cannot wedge
 * the overlay or block the serialized exchange queue.
 */
export const airGappedQrExchangeAborts$ = new Subject<string>();

/**
 * Public trigger surface (unchanged for callers): display the request as an
 * animated QR, scan the device response, then emit once and complete; cancel or
 * error terminates with an error. Backed by the redux-state-driven SW<->view
 * bridge so a SW-side trigger reaches the view-rendered scanner.
 */
export const triggerAirGappedQrExchange: AirGappedQrExchange = options =>
  new Observable<AirGappedQrExchangeResult>(subscriber => {
    const requestId = uuidv4();
    const result$ = new Subject<AirGappedQrExchangeResult>();
    let didSettle = false;
    const subscription = result$.pipe(take(1)).subscribe({
      next: value => {
        didSettle = true;
        subscriber.next(value);
        subscriber.complete();
      },
      error: error => {
        didSettle = true;
        subscriber.error(error);
      },
    });
    airGappedQrExchangeRequests$.next({ requestId, options, result$ });
    return () => {
      subscription.unsubscribe();
      if (!didSettle) {
        airGappedQrExchangeAborts$.next(requestId);
      }
    };
  });
