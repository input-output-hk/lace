import { DappId } from '@lace-contract/dapp-connector';
import { senderOrigin } from '@lace-sdk/dapp-connector';
import { Subject } from 'rxjs';

import type { Dapp } from '@lace-contract/dapp-connector';
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
 * Result of a user confirmation action.
 */
export type CardanoConfirmationResult = {
  /** Whether the user confirmed or rejected the request */
  isConfirmed: boolean;
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
  /** Address for signData requests */
  signDataAddress?: string;
  /** Payload for signData requests */
  signDataPayload?: string;
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
 * @returns Object containing the callback function and a shutdown function for cleanup
 */
export const createCardanoConfirmationCallback = <T>(
  handleRequests: (
    request$: Observable<CardanoConfirmationRequest>,
  ) => Observable<T>,
  subscriber: Subscriber<T>,
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

    return new Promise<CardanoConfirmationResult>(resolve => {
      const request: CardanoConfirmationRequest = {
        resolve,
        requestingDapp: {
          id: DappId(dappOrigin),
          name: sender.tab?.title || '',
          origin: dappOrigin,
          imageUrl: sender.tab?.favIconUrl || '',
        },
        windowId: sender.tab?.windowId,
        type,
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
