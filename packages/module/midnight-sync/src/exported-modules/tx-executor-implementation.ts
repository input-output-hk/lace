import {
  buildTx,
  makeConfirmTx,
  discardTx,
  submitTx,
  makePreviewTx,
} from '../store/tx-executor';

import type {
  MidnightSpecificSendFlowData,
  MidnightSpecificTokenMetadata,
} from '@lace-contract/midnight-context';
import type { MakeTxExecutorImplementation } from '@lace-contract/tx-executor';

export const makeTxExecutor = () =>
  (dependencies => ({
    blockchainName: 'Midnight',
    buildTx: buildTx(dependencies),
    previewTx: makePreviewTx(dependencies),
    confirmTx: makeConfirmTx(dependencies),
    discardTx,
    submitTx: submitTx(dependencies),
  })) satisfies MakeTxExecutorImplementation<
    MidnightSpecificSendFlowData,
    MidnightSpecificTokenMetadata
  > as MakeTxExecutorImplementation;

export default makeTxExecutor;
