import { createStateMachine } from '@lace-lib/util-store';

import type {
  CollateralFlowSliceState,
  StateAwaitingUtxo,
  StateBuilding,
  StateReady,
  StateNotEnoughBalance,
  StateConfirming,
  StateSubmitting,
  StateSet,
  StateFailure,
  StateDiscardingTx,
  StateRequested,
  StateReclaiming,
  StateSettingUnspendable,
} from './types';
import type {
  TxBuildResult,
  TxConfirmationResult,
  TxSubmissionResult,
} from '@lace-contract/tx-executor';
import type { AccountId, AnyWallet } from '@lace-contract/wallet-repo';

const initialState = {
  status: 'Idle',
} as CollateralFlowSliceState;

export const collateralFlowMachine = createStateMachine(
  'collateralFlow',
  initialState,
  {
    Idle: {
      buildRequested: (
        _,
        {
          accountId,
          wallet,
        }: {
          accountId: AccountId;
          wallet: AnyWallet;
        },
      ) => ({
        status: 'Requested',
        accountId,
        wallet,
      }),
      closed: () => initialState,
      // Discard completion can fire after user closed (transitioned to Idle); ignore.
      discardingTxCompleted: () => initialState,
    },
    Requested: {
      unspendableUtxoFound: (
        previousState: StateRequested,
        { txKey }: { txKey: string },
      ) => {
        return {
          accountId: previousState.accountId,
          txKey,
          status: 'Set',
        } satisfies StateSet;
      },
      noUnspendableUtxo: (previousState: StateRequested) => {
        return {
          ...previousState,
          status: 'Building',
        } satisfies StateBuilding;
      },
      eligibleCollateralFound: (
        previousState: StateRequested,
        {
          txKey,
        }: {
          txKey: string;
        },
      ) =>
        ({
          accountId: previousState.accountId,
          wallet: previousState.wallet,
          txKey,
          status: 'Ready',
        } satisfies StateReady),
      closed: () => initialState,
    },
    Building: {
      insufficientBalance: (previousState: StateBuilding) => {
        return {
          ...previousState,
          status: 'NotEnoughBalance',
        } satisfies StateNotEnoughBalance;
      },
      buildCompleted: (
        previousState: StateBuilding,
        { result }: { result: TxBuildResult },
      ) => {
        if (result.success) {
          return {
            ...previousState,
            status: 'Ready',
            fees: result.fees,
            serializedTx: result.serializedTx,
          } satisfies StateReady;
        }

        return {
          ...previousState,
          status: 'NotEnoughBalance',
        } satisfies StateNotEnoughBalance;
      },
      closed: () => initialState,
    },
    Ready: {
      confirmed: (previousState: StateReady) => {
        // If txKey exists, transition to SettingUnspendable instead of Confirming
        if ('txKey' in previousState && previousState.txKey) {
          return {
            accountId: previousState.accountId,
            txKey: previousState.txKey,
            status: 'SettingUnspendable',
          } satisfies StateSettingUnspendable;
        }
        // Ensure required fields are present before transitioning to Confirming
        if (!previousState.fees || !previousState.serializedTx) {
          return {
            ...previousState,
            status: 'Failure',
            error: undefined,
            errorTranslationKeys: {
              title: 'collateral.sheet.failure.title',
              subtitle: 'collateral.sheet.failure.subtitle',
            },
            fees: [],
            serializedTx: '',
          } satisfies StateFailure;
        }
        return {
          ...previousState,
          status: 'Confirming',
          fees: previousState.fees,
          serializedTx: previousState.serializedTx,
        } satisfies StateConfirming;
      },
      closed: ({ serializedTx }: StateReady): CollateralFlowSliceState => {
        if (serializedTx) {
          // Transaction needs to be discarded
          return {
            serializedTx,
            status: 'DiscardingTx',
          } satisfies StateDiscardingTx;
        }
        return initialState;
      },
    },
    NotEnoughBalance: {
      closed: () => initialState,
    },
    Confirming: {
      confirmationCompleted: (
        previousState: StateConfirming,
        { result }: { result: TxConfirmationResult },
      ) => {
        if (result.success && 'serializedTx' in previousState) {
          return {
            ...previousState,
            serializedTx: result.serializedTx,
            status: 'Submitting',
          } satisfies StateSubmitting;
        }

        return {
          ...previousState,
          status: 'Failure',
          error: undefined,
          errorTranslationKeys: {
            title: 'collateral.sheet.failure.title',
            subtitle: 'collateral.sheet.failure.subtitle',
          },
        } satisfies StateFailure;
      },
      closed: (previousState: StateConfirming) => {
        if ('serializedTx' in previousState) {
          return {
            ...previousState,
            status: 'DiscardingTx',
          } satisfies StateDiscardingTx;
        }
        return initialState;
      },
    },
    Submitting: {
      submissionCompleted: (
        previousState: StateSubmitting,
        { result }: { result: TxSubmissionResult },
      ) => {
        if (result.success) {
          return {
            ...previousState,
            status: 'AwaitingUtxo',
            txId: result.txId,
          } satisfies StateAwaitingUtxo;
        }

        return {
          ...previousState,
          status: 'Failure',
          error: result.error,
          errorTranslationKeys: result.errorTranslationKeys,
        } satisfies StateFailure;
      },
      closed: (previousState: StateSubmitting) => previousState,
    },
    SettingUnspendable: {
      utxoSet: () => {
        return initialState;
      },
      utxoNotFound: () => {
        return {
          status: 'Failure',
          error: undefined,
          errorTranslationKeys: {
            title: 'collateral.sheet.failure.title',
            subtitle: 'collateral.sheet.failure.subtitle',
          },
          fees: [],
          serializedTx: '',
        } satisfies StateFailure;
      },
      closed: () => initialState,
    },
    AwaitingUtxo: {
      utxoFound: () => initialState,
      utxoTimeout: (previousState: StateAwaitingUtxo) => {
        return {
          ...previousState,
          status: 'Failure',
          error: undefined,
          errorTranslationKeys: {
            title: 'collateral.sheet.failure.title',
            subtitle: 'collateral.sheet.failure.subtitle',
          },
          fees: [],
          serializedTx: '',
        } satisfies StateFailure;
      },
      closed: (previousState: StateAwaitingUtxo) => previousState,
    },
    Set: {
      reclaimRequested: (previousState: StateSet) =>
        ({
          accountId: previousState.accountId,
          txKey: previousState.txKey,
          status: 'Reclaiming',
        } satisfies StateReclaiming),
      closed: () => initialState,
    },
    Reclaiming: {
      reclaimSucceeded: () => initialState,
      closed: () => initialState,
    },
    Failure: {
      closed: ({ serializedTx }: StateFailure): CollateralFlowSliceState => {
        if (serializedTx) {
          return {
            serializedTx,
            status: 'DiscardingTx',
          } satisfies StateDiscardingTx;
        }
        return initialState;
      },
    },
    DiscardingTx: {
      discardingTxCompleted: () => initialState,
      closed: () => initialState,
    },
  },
);
