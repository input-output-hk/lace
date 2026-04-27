import { createAction } from '@reduxjs/toolkit';

import type {
  ConfirmTxParams,
  TxConfirmationResult,
  TxExecutorImplementation,
  TxExecutorImplementationMethodName,
} from '../types';
import type { AnyFunction } from '@lace-contract/module';
import type { BlockchainAssigned } from '@lace-lib/util-store';
import type { Observable } from 'rxjs';

type InferResultType<T extends AnyFunction> = ReturnType<T> extends Observable<
  infer U
>
  ? U
  : never;

export type ConfirmTxActionParams<BlockchainSpecificSendFlowData = unknown> =
  ConfirmTxParams<BlockchainSpecificSendFlowData>;

export type MapOfExecutorConfig<BlockchainSpecificSendFlowData = unknown> = {
  [Type in Exclude<TxExecutorImplementationMethodName, 'confirmTx'>]: {
    params: Parameters<TxExecutorImplementation[Type]>[0];
    result: InferResultType<TxExecutorImplementation[Type]>;
  };
} & {
  confirmTx: {
    params: ConfirmTxActionParams<BlockchainSpecificSendFlowData>;
    result: TxConfirmationResult;
  };
};

export type TxPhaseConfig = {
  [Type in keyof MapOfExecutorConfig]: {
    params: BlockchainAssigned<MapOfExecutorConfig[Type]['params']>;
    type: Type;
  };
}[keyof MapOfExecutorConfig];

export type TxPhaseResult = {
  [Type in keyof MapOfExecutorConfig]: MapOfExecutorConfig[Type]['result'];
}[keyof MapOfExecutorConfig];

export const txPhaseRequested = createAction(
  'txExecutor/tx-phase-requested',
  (payload: { config: TxPhaseConfig; executionId: string }) => ({
    payload,
  }),
);

export const txPhaseCompleted = createAction(
  'txExecutor/tx-phase-completed',
  (payload: { executionId: string; result: TxPhaseResult }) => ({
    payload,
  }),
);

export const txExecutorActions = {
  txExecutor: {
    txPhaseRequested,
    txPhaseCompleted,
  },
};
