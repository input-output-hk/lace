import { createStateMachine } from '@lace-lib/util-store';
import { BigNumber } from '@lace-sdk/util';

import { isFormCorrect } from './is-form-correct';
import {
  applyAddressValidationResult,
  applyBlockchainSpecificError,
  applyFormDataChange,
  applyTokenAmountError,
  isAddressChange,
  singleTransfer,
  txBuildResulted,
  txPreviewResulted,
  updateToken,
} from './utils';

import type {
  FormChangeData,
  FormValidationResult,
  SendFlowSliceState,
  StateOpen,
} from '../types';
import type { Token } from '@lace-contract/tokens';
import type {
  TxBuildResult,
  TxConfirmationResult,
  TxSubmissionResult,
} from '@lace-contract/tx-executor';
import type { AccountId, AnyWallet } from '@lace-contract/wallet-repo';
import type { BlockchainAssigned, EventOf } from '@lace-lib/util-store';

const initialState = {
  status: 'Idle',
} as SendFlowSliceState;

export type SendFlowEvent = EventOf<typeof sendFlowMachine>;

export const sendFlowMachine = createStateMachine('sendFlow', initialState, {
  Idle: {
    openRequested: (
      _,
      {
        accountId,
        blockchainSpecificData = {},
        initialAddress,
        initialAmount,
        initialSelectedToken,
      }: {
        accountId?: AccountId;
        blockchainSpecificData?: unknown;
        initialAddress?: string;
        initialAmount?: BigNumber;
        initialSelectedToken?: Token;
      },
    ) => ({
      status: 'Preparing',
      accountId,
      blockchainSpecificData,
      initialAddress,
      initialAmount,
      initialSelectedToken,
    }),
    closed: () => initialState,
  },
  Preparing: {
    preparingCompleted: (
      { blockchainSpecificData },
      {
        accountId,
        blockchainName,
        form,
        wallet,
      }: BlockchainAssigned<{
        accountId: AccountId;
        form: StateOpen['form'];
        wallet: AnyWallet;
      }>,
    ) => ({
      accountId,
      blockchainSpecificData,
      confirmButtonEnabled: false,
      blockchainName,
      fees: [],
      form,
      // Initialize minimum amount to -1 (which is impossible as a valid amount) to indicate
      // that it is not yet initialized so that the user can see the three dots in the UI
      minimumAmount: BigNumber(-1n),
      serializedTx: '',
      status: 'FormPendingValidation',
      wallet,
    }),
    formDataChanged: (previousState, { data }: { data: FormChangeData }) => {
      // Allow address changes while preparing - store for use in preparingCompleted
      if (isAddressChange(data)) {
        return {
          ...previousState,
          initialAddress: data.value,
        };
      }
      // Ignore other form changes during preparation
      return previousState;
    },
    closed: () => initialState,
  },
  Form: {
    formDataChanged: (previousState, { data }: { data: FormChangeData }) =>
      applyFormDataChange(previousState, data),

    txBuildResulted: (previousState, _event: { result: TxBuildResult }) =>
      previousState,

    txPreviewResulted,

    selectToken: previousState => ({
      ...previousState,
      status: 'SelectToken',
    }),

    confirmed: previousState => {
      if (
        !previousState.confirmButtonEnabled ||
        !isFormCorrect(previousState.form) ||
        !previousState.serializedTx
      ) {
        return previousState;
      }

      return {
        ...previousState,
        status: 'Summary',
      };
    },

    closed: ({ serializedTx, blockchainName }) => {
      if (serializedTx) {
        return {
          blockchainName,
          serializedTx,
          status: 'DiscardingTx',
        };
      }

      return initialState;
    },
  },
  SelectToken: {
    // TODO: This just swaps the first token, we will keep this for now
    // to not break the midnight app.
    handleTokenChange: (previousState, { token }: { token: Token }) => {
      const { form } = previousState;

      const nextTransfers = form.tokenTransfers.length
        ? updateToken(
            form.tokenTransfers,
            form.tokenTransfers[0].token.value.tokenId,
            tt => ({
              ...tt,
              token: { value: token },
              amount: {
                // NFT amount (fixed at 1) is set; fungible resets to 0 awaiting user input.
                dirty: token.metadata?.isNft === true,
                error: null,
                value: token.metadata?.isNft ? BigNumber(1n) : BigNumber(0n),
              },
            }),
          )
        : singleTransfer({
            amount: {
              dirty: token.metadata?.isNft === true,
              error: null,
              value: token.metadata?.isNft ? BigNumber(1n) : BigNumber(0n),
            },
            token: { value: token },
          });

      return {
        ...previousState,
        confirmButtonEnabled: false,
        fees: [],
        txBuildErrorTranslationKey: undefined,
        status: 'FormPendingValidation',
        form: {
          ...form,
          tokenTransfers: nextTransfers,
        },
      };
    },
    back: previousState => ({
      ...previousState,
      status: 'Form',
    }),
    closed: ({ serializedTx, blockchainName }) => {
      if (serializedTx) {
        return {
          blockchainName,
          serializedTx,
          status: 'DiscardingTx',
        };
      }

      return initialState;
    },
  },
  FormPendingValidation: {
    txBuildResulted: (previousState, _event: { result: TxBuildResult }) =>
      previousState,

    txPreviewResulted,

    formValidationCompleted: (
      previousState,
      { result }: { result: FormValidationResult[] },
    ) => {
      const nextForm: StateOpen['form'] = result.reduce((form, item) => {
        switch (item.fieldName) {
          case 'address':
            return applyAddressValidationResult(form, item);

          case 'blockchainSpecific':
            return applyBlockchainSpecificError(form, item.error);

          case 'tokenTransfers.amount':
            return applyTokenAmountError(form, item.id, item.error);

          default:
            return form;
        }
      }, previousState.form);

      const isFormValid = isFormCorrect(nextForm);

      return {
        ...previousState,
        status: isFormValid ? 'FormTxBuilding' : 'Form',
        confirmButtonEnabled: false,
        serializedTx: isFormValid ? previousState.serializedTx : '',
        form: nextForm,
      };
    },

    closed: ({ serializedTx, blockchainName }) => {
      if (serializedTx) {
        return {
          blockchainName,
          serializedTx,
          status: 'DiscardingTx',
        };
      }

      return initialState;
    },
  },
  FormTxBuilding: {
    formDataChanged: (previousState, { data }: { data: FormChangeData }) =>
      applyFormDataChange(previousState, data),

    txBuildResulted,

    txPreviewResulted,

    closed: ({ serializedTx, blockchainName }) => {
      if (serializedTx) {
        return {
          blockchainName,
          serializedTx,
          status: 'DiscardingTx',
        };
      }

      return initialState;
    },
  },
  Summary: {
    confirmed: previousState => ({
      ...previousState,
      confirmButtonEnabled: false,
      status: 'SummaryAwaitingConfirmation',
    }),

    back: previousState => ({
      ...previousState,
      status: 'Form',
    }),

    closed: ({ serializedTx, blockchainName }) => ({
      blockchainName,
      serializedTx,
      status: 'DiscardingTx',
    }),
  },
  SummaryAwaitingConfirmation: {
    confirmationCompleted: (
      previousState,
      { result }: { result: TxConfirmationResult },
    ) => {
      if (result.success) {
        return {
          ...previousState,
          serializedTx: result.serializedTx,
          confirmButtonEnabled: false,
          status: 'Processing',
        };
      }

      return {
        ...previousState,
        error: result.error,
        errorTranslationKeys: result.errorTranslationKeys,
        confirmButtonEnabled: true,
        status: 'Failure',
      };
    },

    closed: ({ serializedTx, blockchainName }) => ({
      blockchainName,
      serializedTx,
      status: 'DiscardingTx',
    }),
  },
  Processing: {
    processingResulted: (
      previousState,
      { result }: { result: TxSubmissionResult },
    ) => {
      if (result.success) {
        const { blockchainName, blockchainSpecificData, fees, form } =
          previousState;
        return {
          blockchainName,
          blockchainSpecificData,
          confirmButtonEnabled: true,
          fees,
          form,
          status: 'Success',
          txId: result.txId,
        };
      }

      return {
        ...previousState,
        confirmButtonEnabled: true,
        error: result.error,
        errorTranslationKeys: result.errorTranslationKeys,
        status: 'Failure',
      };
    },

    closed: previousState => previousState,
  },
  Success: {
    confirmed: () => initialState,
    closed: () => initialState,
  },
  Failure: {
    confirmed: previousState => ({
      ...previousState,
      // Clear error state when retrying to prevent stale errors from persisting
      error: undefined,
      errorTranslationKeys: undefined,
      status: 'Form',
    }),

    closed: ({ serializedTx, blockchainName }) => ({
      blockchainName,
      serializedTx,
      status: 'DiscardingTx',
    }),
  },
  DiscardingTx: {
    discardingTxCompleted: () => initialState,
    openRequested: (
      _,
      {
        accountId,
        blockchainSpecificData = {},
        initialAddress,
        initialAmount,
        initialSelectedToken,
      }: {
        accountId?: AccountId;
        blockchainSpecificData?: unknown;
        initialAddress?: string;
        initialAmount?: BigNumber;
        initialSelectedToken?: Token;
      },
    ) => ({
      status: 'Preparing',
      accountId,
      blockchainSpecificData,
      initialAddress,
      initialAmount,
      initialSelectedToken,
    }),
    closed: () => initialState,
  },
});
