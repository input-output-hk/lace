import { DappId } from '@lace-contract/dapp-connector';
import { senderOrigin } from '@lace-lib/dapp-connector';
import { Subject } from 'rxjs';

import type { SignPsbtOptions } from '../../types';
import type { BitcoinSignatureType } from '@lace-contract/bitcoin-context';
import type { Dapp } from '@lace-contract/dapp-connector';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { Observable, Subscriber } from 'rxjs';
import type { Runtime } from 'webextension-polyfill';

/**
 * Types of requests that require user confirmation in the Bitcoin dApp
 * connector.
 */
export type BitcoinRequestType = 'signMessage' | 'signPsbt';

/**
 * Request-specific data for signMessage requests.
 */
export type SignMessageRequestData = {
  /** Address that will sign the message */
  address: string;
  /** Message to sign */
  message: string;
  /** Signature scheme requested by the dApp */
  signatureType: BitcoinSignatureType;
};

/**
 * Request-specific data for signPsbt requests. A single signPsbt
 * call is represented as a one-element psbtsBase64 array.
 */
export type SignPsbtRequestData = {
  /** Base64-encoded PSBTs to sign, in request order */
  psbtsBase64: string[];
  /**
   * Account bound to the dApp origin when the request arrived, which is the
   * account the PSBTs will be signed with. Carried through to the review so it
   * describes that one account, whatever the origin is rebound to meanwhile.
   */
  accountId: AccountId;
  /** Sign scope and finalization behavior, applied to each PSBT */
  options?: SignPsbtOptions;
};

/**
 * Maps request types to their specific data payloads.
 */
export type BitcoinRequestData<R extends BitcoinRequestType> =
  R extends 'signMessage' ? SignMessageRequestData : SignPsbtRequestData;

/**
 * Result of a user confirmation action.
 */
export type BitcoinConfirmationResult = {
  /** Whether the user confirmed or rejected the request */
  isConfirmed: boolean;
};

/**
 * Internal type for building the confirmation request with resolve function.
 */
type ConfirmationRequestBase = {
  /** Function to resolve the Promise with the confirmation result */
  resolve: (confirmationResult: BitcoinConfirmationResult) => void;
  /** The type of request being made */
  type: BitcoinRequestType;
};

/**
 * Full confirmation request object passed to the handleRequests function.
 *
 * Contains all information needed to display the confirmation popup and
 * resolve the pending Promise.
 */
export type BitcoinConfirmationRequest = ConfirmationRequestBase & {
  /** Information about the dApp making the request */
  requestingDapp: Dapp;
  /** Browser window the request originated from, used to target its side panel */
  windowId?: number;
  /** Address for signMessage requests */
  address?: string;
  /** Message for signMessage requests */
  message?: string;
  /** Signature scheme for signMessage requests */
  signatureType?: BitcoinSignatureType;
  /** Base64-encoded PSBTs for signPsbt requests */
  psbtsBase64?: string[];
  /** Signing account for signPsbt requests, captured when the request arrived */
  accountId?: AccountId;
  /** Sign scope and finalization behavior for signPsbt requests */
  options?: SignPsbtOptions;
};

/**
 * Result of createBitcoinConfirmationCallback containing the callback and a
 * shutdown function for cleanup.
 */
export type BitcoinConfirmationCallbackResult = {
  /** The callback function to trigger confirmation requests */
  callback: <R extends BitcoinRequestType>(
    sender: Runtime.MessageSender,
    type: R,
    requestData: BitcoinRequestData<R>,
  ) => Promise<BitcoinConfirmationResult>;
  /** Cleanup function to unsubscribe and complete the internal Subject */
  shutdown: () => void;
};

/**
 * Type alias for the callback function returned by
 * createBitcoinConfirmationCallback.
 */
export type BitcoinConfirmationCallback =
  BitcoinConfirmationCallbackResult['callback'];

/**
 * Creates a confirmation callback factory for Bitcoin dApp connector
 * requests.
 *
 * This factory bridges the Promise-based Unisat/OKX-shaped API with Redux
 * side effects by creating a Subject that emits confirmation requests and a
 * callback that returns Promises resolved by the side effect handlers.
 *
 * @param handleRequests - Function that receives an Observable of
 * confirmation requests and returns an Observable of actions to emit
 * @param subscriber - RxJS Subscriber to emit actions from handleRequests
 * @returns Object containing the callback function and a shutdown function
 * for cleanup
 */
export const createBitcoinConfirmationCallback = <T>(
  handleRequests: (
    request$: Observable<BitcoinConfirmationRequest>,
  ) => Observable<T>,
  subscriber: Subscriber<T>,
): BitcoinConfirmationCallbackResult => {
  const confirmationRequest$ = new Subject<BitcoinConfirmationRequest>();
  const subscription =
    handleRequests(confirmationRequest$).subscribe(subscriber);

  /**
   * Triggers a user confirmation request and returns a Promise that resolves
   * when the user takes action in the review screen.
   *
   * @param sender - The extension message sender (contains tab info)
   * @param type - The type of request (signMessage, signPsbt)
   * @param requestData - Request-specific data
   * @returns Promise that resolves with the confirmation result
   */
  const callback = async <R extends BitcoinRequestType>(
    sender: Runtime.MessageSender,
    type: R,
    requestData: BitcoinRequestData<R>,
  ): Promise<BitcoinConfirmationResult> => {
    const dappOrigin = senderOrigin(sender) || '';

    return new Promise<BitcoinConfirmationResult>(resolve => {
      const request: BitcoinConfirmationRequest = {
        resolve,
        requestingDapp: {
          id: DappId(dappOrigin),
          name: sender.tab?.title || '',
          origin: dappOrigin,
          imageUrl: sender.tab?.favIconUrl || '',
        },
        type,
        windowId: sender.tab?.windowId,
        ...(type === 'signMessage' && {
          address: (requestData as SignMessageRequestData).address,
          message: (requestData as SignMessageRequestData).message,
          signatureType: (requestData as SignMessageRequestData).signatureType,
        }),
        ...(type === 'signPsbt' && {
          psbtsBase64: (requestData as SignPsbtRequestData).psbtsBase64,
          accountId: (requestData as SignPsbtRequestData).accountId,
          options: (requestData as SignPsbtRequestData).options,
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
