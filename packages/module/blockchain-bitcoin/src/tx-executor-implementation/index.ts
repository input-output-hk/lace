import { makeBuildTx, makePreviewTx } from './build-tx';
import { makeConfirmTx } from './confirm-tx';
import { makeDiscardTx } from './discard-tx';
import { makeSubmitTx } from './submit-tx';

import type { PendingActivitiesByAccount } from '@lace-contract/activities';
import type { MakeTxExecutorImplementation } from '@lace-contract/tx-executor';
import type { Observable } from 'rxjs';

type StateObservablesWithPendingActivities = {
  activities?: {
    selectPendingActivitiesByAccount$?: Observable<PendingActivitiesByAccount>;
  };
};

export const makeTxExecutor =
  (): MakeTxExecutorImplementation => (dependencies, stateObservables) => {
    const pendingActivitiesByAccount$ = (
      stateObservables as StateObservablesWithPendingActivities
    )?.activities?.selectPendingActivitiesByAccount$;
    if (!pendingActivitiesByAccount$) {
      throw new Error(
        '[blockchain-bitcoin] makeTxExecutor requires activities.selectPendingActivitiesByAccount$ state observable',
      );
    }
    return {
      blockchainName: 'Bitcoin',
      buildTx: makeBuildTx(dependencies, pendingActivitiesByAccount$),
      previewTx: makePreviewTx(dependencies),
      confirmTx: makeConfirmTx(dependencies),
      discardTx: makeDiscardTx(),
      submitTx: makeSubmitTx(dependencies),
    };
  };

export default makeTxExecutor;
