import { makeBuildTx, makePreviewTx } from './build-tx';
import { makeConfirmTx } from './confirm-tx';
import { makeDiscardTx } from './discard-tx';
import { makeSubmitTx } from './submit-tx';

import type { MakeTxExecutorImplementation } from '@lace-contract/tx-executor';

export const makeTxExecutor =
  (): MakeTxExecutorImplementation => dependencies => ({
    blockchainName: 'Bitcoin',
    buildTx: makeBuildTx(dependencies),
    previewTx: makePreviewTx(dependencies),
    confirmTx: makeConfirmTx(dependencies),
    discardTx: makeDiscardTx(),
    submitTx: makeSubmitTx(dependencies),
  });

export default makeTxExecutor;
