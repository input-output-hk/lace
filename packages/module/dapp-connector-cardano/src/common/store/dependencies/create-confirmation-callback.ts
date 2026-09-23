import { DappId } from '@lace-contract/dapp-connector';
import { senderOrigin } from '@lace-lib/dapp-connector';
import {
  concatWith,
  filter,
  map,
  NEVER,
  shareReplay,
  Subject,
  take,
} from 'rxjs';

import type { CollateralOwnershipErrorCase } from '@lace-contract/cardano-context';
import type { Dapp } from '@lace-contract/dapp-connector';
import type { DisconnectEvent } from '@lace-lib/extension-messaging';
import type { Observable, Subscriber } from 'rxjs';
import type { Runtime } from 'webextension-polyfill';

/**
 * Types of requests that require user confirmation in the Cardano dApp connector.
 */
export type CardanoRequestType = 'connect' | 'signData' | 'signTx';

/**
 * Request-specific data for signTx operations.
 */
export type SignTxRequestData = {
  /** CBOR-encoded transaction hex string */
  txHex: string;
  /** Whether this is a partial sign (multiple signers) */
  partialSign: boolean;
  /**
   * Present ONLY when the collateral-ownership guard blocked the request: the
   * consent surface is then opened in the refused state instead of the review
   * state. Omitted entirely on the allow path, which keeps the ordinary
   * request payload byte-identical to today.
   */
  collateralRefusal?: CollateralOwnershipErrorCase;
};

/**
 * Request-specific data for signData operations (CIP-8).
 */
export type SignDataRequestData = {
  /** Address that will sign the data (bech32 or hex) */
  address: string;
  /** Payload to sign (hex-encoded) */
  payload: string;
};

/**
 * Maps request types to their specific data payloads.
 */
export type RequestData<R extends CardanoRequestType> = R extends 'signTx'
  ? SignTxRequestData
  : R extends 'signData'
  ? SignDataRequestData
  : undefined;

/**
 * Outcome of a user confirmation action.
 *
 * `disconnected` is deliberately distinct from `rejected`: it means the dApp's
 * port dropped (e.g. the page froze into the back/forward cache) before the
 * user acted, so it is surfaced as a connection error rather than a false
 * "user rejected".
 *
 * `unavailable` means the wallet never managed to show the prompt, so the user
 * was never asked. It is likewise not a refusal.
 */
export type CardanoConfirmationResult = {
  /** How the confirmation request was resolved */
  outcome: 'confirmed' | 'disconnected' | 'rejected' | 'unavailable';
};

/**
 * Internal type for building the confirmation request with resolve function.
 */
type ConfirmationRequestBase = {
  /** Function to resolve the Promise with the confirmation result */
  resolve: (confirmationResult: CardanoConfirmationResult) => void;
  /** The type of request being made */
  type: CardanoRequestType;
};

/**
 * Full confirmation request object passed to the handleRequests function.
 *
 * Contains all information needed to display the confirmation popup
 * and resolve the pending Promise.
 */
export type CardanoConfirmationRequest = ConfirmationRequestBase & {
  /** Information about the dApp making the request */
  requestingDapp: Dapp;
  /** Browser window ID where the requesting dApp tab lives */
  windowId?: number;
  /** Transaction hex for signTx requests */
  txHex?: string;
  /** Partial sign flag for signTx requests */
  partialSign?: boolean;
  /**
   * The collateral guard's refusal, or `null` when the request carries none.
   * Required, never optional: a required key must be PRESENT in an object
   * literal, so it cannot be dropped where the request is built -- and a
   * dropped verdict would render a refused transaction as an ordinary review,
   * live Sign button and all.
   */
  collateralRefusal: CollateralOwnershipErrorCase | null;
  /** Address for signData requests */
  signDataAddress?: string;
  /** Payload for signData requests */
  signDataPayload?: string;
  /**
   * Emits once when the wallet-api port of this request's originating sender
   * disconnects, so the pending confirmation can be cancelled. Absent when the
   * sender has no tab id (nothing to match against).
   */
  disconnected$?: Observable<void>;
};

/**
 * Result of createCardanoConfirmationCallback containing the callback
 * and a shutdown function for cleanup.
 */
export type CardanoConfirmationCallbackResult = {
  /** The callback function to trigger confirmation requests */
  callback: <R extends CardanoRequestType>(
    sender: Runtime.MessageSender,
    type: R,
    requestData?: RequestData<R>,
  ) => Promise<CardanoConfirmationResult>;
  /** Cleanup function to unsubscribe and complete the internal Subject */
  shutdown: () => void;
};

/**
 * Type alias for the callback function returned by createCardanoConfirmationCallback.
 */
export type CardanoConfirmationCallback =
  CardanoConfirmationCallbackResult['callback'];

/**
 * Creates a confirmation callback factory for Cardano dApp connector requests.
 *
 * This factory bridges the Promise-based CIP-30 API with Redux side effects
 * by creating a Subject that emits confirmation requests and a callback
 * that returns Promises resolved by the side effect handlers.
 *
 * @param handleRequests - Function that receives an Observable of confirmation requests
 *                         and returns an Observable of actions to emit
 * @param subscriber - RxJS Subscriber to emit actions from handleRequests
 * @param portDisconnected$ - Wallet-api channel disconnects; per request, filtered
 *                            to the originating sender to cancel a pending confirmation
 * @returns Object containing the callback function and a shutdown function for cleanup
 */
export const createCardanoConfirmationCallback = <T>(
  handleRequests: (
    request$: Observable<CardanoConfirmationRequest>,
  ) => Observable<T>,
  subscriber: Subscriber<T>,
  portDisconnected$: Observable<DisconnectEvent>,
): CardanoConfirmationCallbackResult => {
  const confirmationRequest$ = new Subject<CardanoConfirmationRequest>();
  const subscription =
    handleRequests(confirmationRequest$).subscribe(subscriber);

  /**
   * Triggers a user confirmation request and returns a Promise that resolves
   * when the user takes action in the popup window.
   *
   * @param sender - The extension message sender (contains tab info)
   * @param type - The type of request (connect, signTx, signData)
   * @param requestData - Request-specific data (txHex for signTx, address/payload for signData)
   * @returns Promise that resolves with the confirmation result
   */
  const callback = async <R extends CardanoRequestType>(
    sender: Runtime.MessageSender,
    type: R,
    requestData?: RequestData<R>,
  ): Promise<CardanoConfirmationResult> => {
    const dappOrigin = senderOrigin(sender) || '';

    const senderTabId = sender.tab?.id;
    // A request whose sender has no tab id must never match another port's
    // undefined tab id, so it gets a signal that never fires.
    const disconnected$: Observable<void> =
      senderTabId === undefined
        ? NEVER
        : portDisconnected$.pipe(
            filter(
              ({ disconnected }) =>
                disconnected.sender?.tab?.id === senderTabId &&
                disconnected.sender?.frameId === sender.frameId,
            ),
            map(() => undefined),
            take(1),
            // Emits at most once and NEVER completes: this is an arm of the
            // signing race, and rxjs 7.8.2 lets a completing arm end that race
            // — post-confirm that kills the flow before its result arrives.
            concatWith(NEVER),
            // Replayed, and subscribed eagerly below, because requests are
            // served one at a time: the queue may only reach this request
            // after its port is already gone. The source is a hot event with
            // no replay of its own, so without this the drop lands in the
            // window before the request is active and is missed entirely —
            // and the queue then opens a prompt for a dApp that has left.
            shareReplay({ bufferSize: 1, refCount: true }),
          );

    return new Promise<CardanoConfirmationResult>(resolve => {
      // Observe the drop from the moment the request arrives, not from the
      // moment it becomes active. refCount keeps this from outliving the
      // request: the last unsubscribe tears the upstream filter down AND
      // discards the replayed drop, so nothing may subscribe after `resolve`.
      const dropWatch = disconnected$.subscribe();
      const request: CardanoConfirmationRequest = {
        resolve: result => {
          dropWatch.unsubscribe();
          resolve(result);
        },
        disconnected$,
        requestingDapp: {
          id: DappId(dappOrigin),
          name: sender.tab?.title || '',
          origin: dappOrigin,
          imageUrl: sender.tab?.favIconUrl || '',
        },
        windowId: sender.tab?.windowId,
        type,
        // Hoisted out of the conditional spread below: `null` on a connect or
        // signData request is TRUE, not filler -- that request carries no
        // verdict -- and only a plain key can be compile-checked for presence.
        collateralRefusal:
          type === 'signTx'
            ? (requestData as SignTxRequestData | undefined)
                ?.collateralRefusal ?? null
            : null,
        ...(type === 'signTx' &&
          requestData && {
            txHex: (requestData as SignTxRequestData).txHex,
            partialSign: (requestData as SignTxRequestData).partialSign,
          }),
        ...(type === 'signData' &&
          requestData && {
            signDataAddress: (requestData as SignDataRequestData).address,
            signDataPayload: (requestData as SignDataRequestData).payload,
          }),
      };

      confirmationRequest$.next(request);
    });
  };

  const shutdown = () => {
    subscription.unsubscribe();
    confirmationRequest$.complete();
  };

  return { callback, shutdown };
};
