import { DappId } from '@lace-contract/dapp-connector';
import { senderOrigin } from '@lace-sdk/dapp-connector';
import { Subject } from 'rxjs';

import type { AccessAuthSecret } from '@lace-contract/authentication-prompt';
import type { Dapp } from '@lace-contract/dapp-connector';
import type { Observable, Subscriber } from 'rxjs';
import type { Runtime } from 'webextension-polyfill';

export type RequestType = 'proveTransaction' | 'signData' | 'unlockWallet';

export type ConfirmationResult<R extends RequestType> = (R extends
  | 'proveTransaction'
  | 'signData'
  ? {
      accessAuthSecret: AccessAuthSecret;
    }
  : object) & {
  isConfirmed: boolean;
};

export type ConfirmationRequest<R extends RequestType = RequestType> = {
  [RR in RequestType]: {
    resolve: (confirmationResult: ConfirmationResult<RR>) => void;
    type: RR;
  };
}[R] & {
  requestingDapp: Dapp;
  transactionType?: 'shielded' | 'unshielded' | null;
  transactionData?: string;
  signDataPayload?: string;
  signDataKeyType?: string;
};

export type ConfirmationCallback = ReturnType<
  typeof createConfirmationCallback
>;

export const createConfirmationCallback = <T>(
  handleRequests: <R extends RequestType>(
    request$: Observable<ConfirmationRequest<R>>,
  ) => Observable<T>,
  subscriber: Subscriber<T>,
) => {
  const confirmationRequest$ = new Subject<ConfirmationRequest>();
  handleRequests(confirmationRequest$).subscribe(subscriber);

  return async <R extends RequestType>(
    sender: Runtime.MessageSender,
    type: R,
    options?: {
      transactionType?: 'shielded' | 'unshielded' | null;
      transactionData?: string;
      signDataPayload?: string;
      signDataKeyType?: string;
    },
  ) => {
    const dappOrigin = senderOrigin(sender) || '';
    return new Promise<ConfirmationResult<R>>(resolve => {
      const request = {
        resolve,
        requestingDapp: {
          id: DappId(dappOrigin),
          name: sender.tab?.title || '',
          origin: dappOrigin,
          imageUrl: sender.tab?.favIconUrl || '',
        },
        type,
        ...(options?.transactionType !== undefined && {
          transactionType: options.transactionType,
        }),
        ...(options?.transactionData !== undefined && {
          transactionData: options.transactionData,
        }),
        ...(options?.signDataPayload !== undefined && {
          signDataPayload: options.signDataPayload,
        }),
        ...(options?.signDataKeyType !== undefined && {
          signDataKeyType: options.signDataKeyType,
        }),
      };
      confirmationRequest$.next(request as ConfirmationRequest);
    });
  };
};
