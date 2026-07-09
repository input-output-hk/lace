import { makeBuildTx, makePreviewTx } from './build-tx';
import { makeConfirmTx } from './confirm-tx';
import { makeDiscardTx } from './discard-tx';
import { makeSubmitTx } from './submit-tx';

import type { AccountUtxoMap } from '@lace-contract/cardano-context';
import type { MakeTxExecutorImplementation } from '@lace-contract/tx-executor';
import type { Observable } from 'rxjs';

export { makeBuildDelegationTx } from './build-delegation-tx';
export { makeBuildDeregistrationTx } from './build-deregistration-tx';

type StateObservablesWithAvailableAccountUtxos = {
  cardanoContext?: {
    selectAvailableAccountUtxos$?: Observable<AccountUtxoMap>;
  };
};

export const makeTxExecutor =
  (): MakeTxExecutorImplementation => (dependencies, stateObservables) => {
    const cardanoAvailableAccountUtxos$ = (
      stateObservables as StateObservablesWithAvailableAccountUtxos
    )?.cardanoContext?.selectAvailableAccountUtxos$;
    if (!cardanoAvailableAccountUtxos$) {
      throw new Error(
        '[blockchain-cardano] makeTxExecutor requires cardanoContext.selectAvailableAccountUtxos$ state observable',
      );
    }
    return {
      blockchainName: 'Cardano',
      buildTx: makeBuildTx(dependencies, cardanoAvailableAccountUtxos$),
      previewTx: makePreviewTx(dependencies, cardanoAvailableAccountUtxos$),
      confirmTx: makeConfirmTx(dependencies, cardanoAvailableAccountUtxos$),
      discardTx: makeDiscardTx(),
      submitTx: makeSubmitTx(dependencies),
    };
  };

export default makeTxExecutor;
