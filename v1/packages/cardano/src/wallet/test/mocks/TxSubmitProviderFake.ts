import { TxSubmitProvider } from '@cardano-sdk/core';
import { Observable, ReplaySubject } from 'rxjs';

export type TxSubmitProviderFake = TxSubmitProvider & { submittedTxs$: Observable<Uint8Array> };
export const TxSubmitProviderFake = {
  make: (): TxSubmitProviderFake => {
    const submittedTxs = new ReplaySubject<Uint8Array>();
    return {
      submittedTxs$: submittedTxs.asObservable(),
      submitTx: ({ signedTransaction }): Promise<void> =>
        new Promise((resolve) => {
          submittedTxs.next(signedTransaction);
          resolve();
        }),
      healthCheck: (): Promise<{ ok: boolean }> => Promise.resolve({ ok: true })
    };
  }
};
