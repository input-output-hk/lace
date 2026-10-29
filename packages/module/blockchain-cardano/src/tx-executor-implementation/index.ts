import { makeBuildTx, makePreviewTx } from './build-tx';
import { makeConfirmTx } from './confirm-tx';
import { makeDiscardTx } from './discard-tx';
import { makeSubmitTx } from './submit-tx';

import type {
  AccountUtxoMap,
  PendingRewardWithdrawals,
} from '@lace-contract/cardano-context';
import type { MakeTxExecutorImplementation } from '@lace-contract/tx-executor';
import type { Observable } from 'rxjs';

export { makeBuildDelegationTx } from './build-delegation-tx';
export { makeBuildDeregistrationTx } from './build-deregistration-tx';
export { makeBuildVoteDelegationTx } from './build-vote-delegation-tx';
export { makeBuildEarnRewardsTx } from './build-earn-rewards-tx';

type StateObservablesWithAvailableAccountUtxos = {
  cardanoContext?: {
    selectAvailableAccountUtxos$?: Observable<AccountUtxoMap>;
    selectCollateralOwnershipUtxos$?: Observable<AccountUtxoMap>;
    selectPendingRewardWithdrawals$?: Observable<PendingRewardWithdrawals>;
  };
};

export const makeTxExecutor =
  (): MakeTxExecutorImplementation => (dependencies, stateObservables) => {
    const cardanoAvailableAccountUtxos$ = (
      stateObservables as StateObservablesWithAvailableAccountUtxos
    )?.cardanoContext?.selectAvailableAccountUtxos$;
    const cardanoCollateralOwnershipUtxos$ = (
      stateObservables as StateObservablesWithAvailableAccountUtxos
    )?.cardanoContext?.selectCollateralOwnershipUtxos$;
    const pendingRewardWithdrawals$ = (
      stateObservables as StateObservablesWithAvailableAccountUtxos
    )?.cardanoContext?.selectPendingRewardWithdrawals$;
    if (
      !cardanoAvailableAccountUtxos$ ||
      !cardanoCollateralOwnershipUtxos$ ||
      !pendingRewardWithdrawals$
    ) {
      throw new Error(
        '[blockchain-cardano] makeTxExecutor requires cardanoContext.selectAvailableAccountUtxos$, selectCollateralOwnershipUtxos$ and selectPendingRewardWithdrawals$ state observables',
      );
    }
    return {
      blockchainName: 'Cardano',
      buildTx: makeBuildTx(
        dependencies,
        cardanoAvailableAccountUtxos$,
        pendingRewardWithdrawals$,
      ),
      previewTx: makePreviewTx(
        dependencies,
        cardanoAvailableAccountUtxos$,
        pendingRewardWithdrawals$,
      ),
      confirmTx: makeConfirmTx(
        dependencies,
        cardanoAvailableAccountUtxos$,
        cardanoCollateralOwnershipUtxos$,
      ),
      discardTx: makeDiscardTx(),
      submitTx: makeSubmitTx(dependencies),
    };
  };

export default makeTxExecutor;
