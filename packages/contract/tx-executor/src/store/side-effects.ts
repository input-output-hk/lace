import { toItemsByBlockchainName } from '@lace-lib/util-store';
import { EMPTY, defer, map, merge, of, shareReplay, switchMap } from 'rxjs';

import { genericErrorResults } from './generic-error-results';

import type { ConfirmTxActionParams, TxPhaseConfig } from './slice';
import type { ActionCreators, SideEffect } from '../contract';
import type {
  MakeTxExecutorImplementation,
  TxExecutorImplementation,
} from '../types';
import type { LaceInit } from '@lace-contract/module';
import type { BlockchainName } from '@lace-lib/util-store';

const confirmTxFlow = ({
  actions,
  blockchainSpecificSendFlowData,
  confirmTxImplementation,
  executionId,
  serializedTx,
  wallet,
  accountId,
}: ConfirmTxActionParams & {
  actions: ActionCreators;
  confirmTxImplementation: TxExecutorImplementation['confirmTx'];
  executionId: string;
}) => {
  return defer(() => {
    const account = wallet.accounts.find(a => a.accountId === accountId);

    if (!account) {
      throw new Error(`Account ${accountId} not found in provided wallet`);
    }

    return confirmTxImplementation({
      blockchainName: account.blockchainName,
      blockchainSpecificSendFlowData,
      serializedTx,
      wallet,
      accountId,
    }).pipe(
      map(result =>
        actions.txExecutor.txPhaseCompleted({ executionId, result }),
      ),
    );
  });
};

const executeTxExecutorPhase = (
  txExecutorImplementation: TxExecutorImplementation,
  config: Exclude<TxPhaseConfig, TxPhaseConfig & { type: 'confirmTx' }>,
) => {
  switch (config.type) {
    case 'buildTx': {
      return txExecutorImplementation[config.type](config.params);
    }
    case 'previewTx': {
      return txExecutorImplementation[config.type](config.params);
    }
    case 'discardTx': {
      return txExecutorImplementation[config.type](config.params);
    }
    case 'submitTx': {
      return txExecutorImplementation[config.type](config.params);
    }
  }
};

const synchronousSelector =
  (implementations: TxExecutorImplementation[]) =>
  (activeBlockchainName: BlockchainName | undefined) => {
    const implementationsMap = toItemsByBlockchainName(implementations);
    if (!activeBlockchainName) return null;
    return implementationsMap[activeBlockchainName] || null;
  };

export const makeExecuteTxPhase =
  ({
    implementationFactories,
  }: {
    implementationFactories: MakeTxExecutorImplementation[];
  }): SideEffect =>
  ({ txExecutor: { txPhaseRequested$ } }, {}, { actions, ...dependencies }) => {
    const implementations = implementationFactories.map(factory =>
      factory(dependencies),
    );

    const selectTxExecutorImplementation$ = of(
      synchronousSelector(implementations),
    ).pipe(shareReplay(1));

    return txPhaseRequested$.pipe(
      switchMap(({ payload: { executionId, config } }) =>
        selectTxExecutorImplementation$.pipe(
          switchMap(selectTxExecutorImplementation => {
            const txExecutorImplementation = selectTxExecutorImplementation(
              config.params.blockchainName,
            );

            return merge(
              merge(
                !txExecutorImplementation
                  ? of(genericErrorResults[config.type]())
                  : EMPTY,
                txExecutorImplementation && config.type !== 'confirmTx'
                  ? executeTxExecutorPhase(txExecutorImplementation, config)
                  : EMPTY,
              ).pipe(
                map(result =>
                  actions.txExecutor.txPhaseCompleted({
                    executionId,
                    result,
                  }),
                ),
              ),

              txExecutorImplementation && config.type === 'confirmTx'
                ? confirmTxFlow({
                    ...config.params,
                    actions,
                    executionId,
                    confirmTxImplementation: txExecutorImplementation.confirmTx,
                  })
                : EMPTY,
            );
          }),
        ),
      ),
    );
  };

export const initializeSideEffects: LaceInit<SideEffect[]> = async ({
  loadModules,
}) => {
  const loadedTxExecutorImplementations = await loadModules(
    'addons.loadTxExecutorImplementation',
  );

  // Store factories instead of creating implementations immediately
  // Implementations will be created with full dependencies when side effect runs
  const implementationFactories: MakeTxExecutorImplementation[] =
    loadedTxExecutorImplementations;

  return [
    makeExecuteTxPhase({
      implementationFactories,
    }),
  ];
};
