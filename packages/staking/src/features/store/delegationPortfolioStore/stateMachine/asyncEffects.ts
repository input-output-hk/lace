// Executes async code
// Never sets the state itself, but calls commandCallback at the end of execution

import { InputSelectionFailure } from '@cardano-sdk/input-selection';
import { StakingError } from '../../stakingStore';
import { DelegationTx, DrawerManagementStep, State, SubmitTransactionResultState } from './types';

export const asyncEffects = {
  buildTransaction: async ({
    state,
    commandCallback,
  }: {
    state: State;
    commandCallback: (data: DelegationTx) => void;
  }) => {
    const ERROR_MESSAGES: { [key: string]: StakingError } = {
      [InputSelectionFailure.UtxoFullyDepleted]: StakingError.UTXO_FULLY_DEPLETED,
      [InputSelectionFailure.UtxoBalanceInsufficient]: StakingError.UTXO_BALANCE_INSUFFICIENT,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isInputSelectionError = (error: any): error is { failure: InputSelectionFailure } =>
      typeof error === 'object' &&
      Object.hasOwn(error, 'failure') &&
      Object.values(InputSelectionFailure).includes(error.failure);

    if (!state.inMemoryWallet || !state.draftPortfolio) return;

    // eslint-disable-next-line one-var
    let txBuilder, isRestaking, inspection, stakingError;
    try {
      txBuilder = state.inMemoryWallet.createTxBuilder();
      const pools = state.draftPortfolio.map((pool) => ({
        id: pool.id,
        weight: pool.sliderIntegerPercentage,
      }));
      isRestaking = state.currentPortfolio.length > 0;
      inspection = await txBuilder.delegatePortfolio({ pools }).build().inspect();
    } catch (error) {
      console.error({ error });
      if (isInputSelectionError(error)) {
        stakingError = ERROR_MESSAGES[error.failure];
      }
    }
    commandCallback({ builder: txBuilder, error: stakingError, inspection, isRestaking });
  },
  signSubmitTransaction: async ({
    state,
    commandCallback,
  }: {
    state: State;
    commandCallback: (data: SubmitTransactionResultState) => void;
  }) => {
    if (!state.transaction?.builder)
      throw new Error('Unable to submit transaction. The delegationTxBuilder not available');
    if (!state.inMemoryWallet || !state.draftPortfolio) return;

    let activeDrawerStep;
    let passwordInvalid = false;
    try {
      const signedTx = await state.transaction.builder.build().sign();
      await state.inMemoryWallet.submitTx(signedTx.tx);
      activeDrawerStep = DrawerManagementStep.Success;
    } catch (error) {
      // @ts-ignore TODO
      if (error.message?.includes('Authentication failure')) {
        passwordInvalid = true;
      } else {
        activeDrawerStep = DrawerManagementStep.Failure;
      }
    }
    commandCallback({ activeDrawerStep, passwordInvalid });
  },
} as const;
