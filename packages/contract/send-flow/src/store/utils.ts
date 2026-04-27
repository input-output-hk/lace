import { BigNumber } from '@lace-sdk/util';

import type {
  AddressValidationResult,
  AmountError,
  FormData,
  FormChangeData,
  SendFlowSliceState,
  StateClosed,
  StateOpen,
  StateSuccess,
  TokenTransfer,
} from '../types';
import type { Token, TokenId } from '@lace-contract/tokens';
import type {
  TxBuildResult,
  TxPreviewResult,
} from '@lace-contract/tx-executor';

type SendFlowStatus = SendFlowSliceState['status'];

export const isSendFlowFormStep = (
  state: SendFlowSliceState,
): state is StateOpen & { status: 'Form' | 'FormPendingValidation' } =>
  (
    ['Form', 'FormPendingValidation', 'FormTxBuilding'] as SendFlowStatus[]
  ).includes(state.status);

export const isSendFlowSelectTokenStep = (
  state: SendFlowSliceState,
): state is StateOpen & { status: 'SelectToken' } =>
  (['SelectToken'] as SendFlowStatus[]).includes(state.status);

export const isSendFlowSummaryStep = (
  state: SendFlowSliceState,
): state is StateOpen & { status: 'Summary' | 'SummaryAwaitingConfirmation' } =>
  (['Summary', 'SummaryAwaitingConfirmation'] as SendFlowStatus[]).includes(
    state.status,
  );

export const isSendFlowProcessingStep = (
  state: SendFlowSliceState,
): state is StateOpen & { status: 'Processing' } =>
  'Processing' === state.status;

export const isSendFlowClosed = (
  state: SendFlowSliceState,
): state is StateClosed =>
  (['Idle', 'Preparing', 'DiscardingTx'] as SendFlowStatus[]).includes(
    state.status,
  );

export const isSendFlowSuccess = (
  state: SendFlowSliceState,
): state is StateSuccess =>
  (['Success'] as SendFlowStatus[]).includes(state.status);

export const parseFeesForSendFlow = (
  availableTokens: Token[],
  fees: StateOpen['fees'],
) =>
  fees
    .map(fee => ({
      ...fee,
      token: availableTokens.find(token => token.tokenId === fee.tokenId),
    }))
    .filter(
      (fee): fee is StateOpen['fees'][number] & { token: Token } => !!fee.token,
    )
    .map(fee => ({
      amount: fee.amount,
      token: fee.token,
    }));

/**
 * Updates a single Token by tokenId.
 * Performs an immutable update using the provided updater function.
 *
 * @template T - Element type containing `{ token: { value: Token } }`.
 * @param {readonly T[]} array - Non-empty array of elements.
 * @param {TokenId} id - Token identifier to match.
 * @param {(t: T) => T} updater - Callback that receives and returns the updated element.
 * @returns {T[]} A new array with the updated element, or a shallow copy if not found.
 */
export const updateToken = <T extends { token: { value: Token } }>(
  array: readonly T[],
  id: TokenId,
  updater: (t: T) => T,
): T[] => {
  const index = array.findIndex(t => t.token.value.tokenId === id);
  if (index === -1) return array.slice();
  return array.map((t, index_) => (index_ === index ? updater(t) : t));
};

/**
 * Updates the `amount.error` field for a specific token transfer, if found.
 *
 * @param {StateOpen['form']['tokenTransfers']} transfers - Current list of token transfers.
 * @param {TokenId} tokenId - Token identifier to find.
 * @param {StateOpen['form']['tokenTransfers'][number]['amount']['error']} error - New error value.
 * @returns {[TokenTransfer, ...TokenTransfer[]] | null} Updated transfer list, or `null` if not found.
 */
export const updateTokenErrorIfFound = (
  transfers: StateOpen['form']['tokenTransfers'],
  tokenId: TokenId,
  error: StateOpen['form']['tokenTransfers'][number]['amount']['error'],
) => {
  const index = transfers.findIndex(tt => tt.token.value.tokenId === tokenId);

  if (index < 0) return null;

  return transfers.map((tt, index_) =>
    index_ === index ? { ...tt, amount: { ...tt.amount, error } } : tt,
  ) as [TokenTransfer, ...TokenTransfer[]];
};

/**
 * Removes a token transfer by `tokenId`.
 * Returns a new array copy and never mutates the original.
 *
 * @template T
 * @param {readonly T[]} array - array of token transfers.
 * @param {TokenId} id - Token identifier to remove.
 * @returns {T[]} New array with the token removed
 *
 * @example
 * const next = removeTokenById(form.tokenTransfers, tokenB.tokenId);
 * form = { ...form, tokenTransfers: next };
 */
export const removeTokenById = <T extends { token: { value: Token } }>(
  array: readonly T[],
  id: TokenId,
): T[] => array.filter(tt => tt.token.value.tokenId !== id);

/**
 * Type guard for address field changes.
 *
 * @param {FormChangeData} d - Change descriptor.
 * @returns {d is Extract<FormChangeData, { fieldName: 'address' }>} True if the field is `address`.
 */
export const isAddressChange = (
  d: FormChangeData,
): d is Extract<FormChangeData, { fieldName: 'address' }> =>
  d.fieldName === 'address';

/**
 * Type guard for token amount field changes.
 *
 * @param {FormChangeData} d - Change descriptor.
 * @returns {d is Extract<FormChangeData, { fieldName: 'tokenTransfers.amount' }>} True if field is `tokenTransfers.amount`.
 */
export const isAmountChange = (
  d: FormChangeData,
): d is Extract<FormChangeData, { fieldName: 'tokenTransfers.amount' }> =>
  d.fieldName === 'tokenTransfers.amount';

/**
 * Type guard for token addition change.
 *
 * @param {FormChangeData} d - Change descriptor.
 * @returns {d is Extract<FormChangeData, { fieldName: 'tokenTransfers.addTokens' }>} True if field is `tokenTransfers.addTokens`.
 */
export const isAddTokens = (
  d: FormChangeData,
): d is Extract<FormChangeData, { fieldName: 'tokenTransfers.addTokens' }> =>
  d.fieldName === 'tokenTransfers.addTokens';

/**
 * Type guard for token removal change.
 *
 * @param {FormChangeData} d - Change descriptor.
 * @returns {d is Extract<FormChangeData, { fieldName: 'tokenTransfers.removeToken' }>} True if field is `tokenTransfers.removeToken`.
 */
export const isRemoveToken = (
  d: FormChangeData,
): d is Extract<FormChangeData, { fieldName: 'tokenTransfers.removeToken' }> =>
  d.fieldName === 'tokenTransfers.removeToken';

/**
 * Type guard for blockchain-specific form changes.
 *
 * @param {FormChangeData} d - Change descriptor.
 * @returns {d is Extract<FormChangeData, { fieldName: 'blockchainSpecific' }>} True if field is `blockchainSpecific`.
 */
export const isBlockchainSpecificChange = (
  d: FormChangeData,
): d is Extract<FormChangeData, { fieldName: 'blockchainSpecific' }> =>
  d.fieldName === 'blockchainSpecific';

/**
 * Wraps a single value into a non-empty tuple.
 *
 * @template T
 * @param {T} x - The single element.
 * @returns {[T, ...T[]]} Non-empty tuple containing `x`.
 *
 * @example
 * const transfers = singleTransfer(initialTransfer);
 */
export const singleTransfer = <T>(x: T): [T, ...T[]] => [x];

/**
 * Applies or clears an address error on a form, immutably.
 *
 * @param {StateOpen['form']} form - Current form.
 * @param {TranslationKey | null} error - New error value or `null` to clear.
 * @returns {StateOpen['form']} Updated form (or same reference if unchanged).
 */
export const applyAddressValidationResult = (
  form: StateOpen['form'],
  validationResult: AddressValidationResult,
): FormData =>
  form.address.error === validationResult.error &&
  form.address.resolvedAddress === validationResult.resolvedAddress
    ? form
    : {
        ...form,
        address: {
          ...form.address,
          error: validationResult.error,
          resolvedAddress: validationResult.resolvedAddress,
        },
      };

/**
 * Applies a blockchain-specific error if the field exists and value changed.
 *
 * @param {StateOpen['form']} form - Current form.
 * @param {string | null} error - New error value or `null` to clear.
 * @returns {StateOpen['form']} Updated form (or same reference if unchanged).
 */
export const applyBlockchainSpecificError = (
  form: StateOpen['form'],
  error: string | null,
) => {
  const bs = form.blockchainSpecific;
  if (!bs || bs.error === error) return form;
  return { ...form, blockchainSpecific: { ...bs, error } };
};

/**
 * Applies a token amount error by token ID, if found.
 *
 * @param {StateOpen['form']} form - Current form.
 * @param {TokenId} id - Token identifier to target.
 * @param {AmountError | null} error - New error value or `null` to clear.
 * @returns {StateOpen['form']} Updated form (or same reference if unchanged).
 */
export const applyTokenAmountError = (
  form: StateOpen['form'],
  id: TokenId,
  error: AmountError | null,
) => {
  const next = updateTokenErrorIfFound(form.tokenTransfers, id, error);
  return next ? { ...form, tokenTransfers: next } : form;
};

/**
 * Applies a form data change and transitions to FormPendingValidation.
 * Shared logic for Form and FormTxBuilding states on formDataChanged event.
 *
 * @param previousState - State with form (Form or FormTxBuilding).
 * @param data - The form change descriptor.
 * @returns Updated state with form changes and status FormPendingValidation.
 */
export const applyFormDataChange = <S extends StateOpen>(
  previousState: S,
  data: FormChangeData,
): S & { status: 'FormPendingValidation' } => {
  const { form } = previousState;
  const nextForm = isAddressChange(data)
    ? {
        ...form,
        address: { ...form.address, value: data.value, dirty: true },
      }
    : isAmountChange(data)
    ? {
        ...form,
        tokenTransfers: updateToken(form.tokenTransfers, data.id, tt => ({
          ...tt,
          amount: { ...tt.amount, value: data.value, dirty: true },
        })),
      }
    : isAddTokens(data)
    ? {
        ...form,
        tokenTransfers: [
          ...form.tokenTransfers,
          ...data.tokens.map(token => ({
            amount: {
              // NFT rows have a fixed amount of 1 (read-only) so they count as set.
              // Fungible rows start at 0 and await user input before validating.
              dirty: token.metadata?.isNft === true,
              error: null,
              value: token.metadata?.isNft ? BigNumber(1n) : BigNumber(0n),
            },
            token: { value: token },
          })),
        ],
      }
    : isRemoveToken(data)
    ? {
        ...form,
        tokenTransfers: removeTokenById(form.tokenTransfers, data.id),
      }
    : isBlockchainSpecificChange(data)
    ? {
        ...form,
        blockchainSpecific: {
          dirty: true,
          error: form.blockchainSpecific?.error ?? null,
          value: data.value,
        },
      }
    : form;

  return {
    ...previousState,
    confirmButtonEnabled: false,
    fees: [],
    txBuildErrorTranslationKey: undefined,
    form: nextForm,
    status: 'FormPendingValidation',
  } as S & { status: 'FormPendingValidation' };
};

type TxHandlersStateOpen = StateOpen & {
  status: 'Form' | 'FormPendingValidation' | 'FormTxBuilding';
};

export const txBuildResulted = (
  previousState: TxHandlersStateOpen,
  { result }: { result: TxBuildResult },
) =>
  result.success
    ? {
        ...previousState,
        confirmButtonEnabled: !result.warningTranslationKey,
        fees: result.fees,
        serializedTx: result.serializedTx,
        status: 'Form' as const,
        txBuildErrorTranslationKey: result.warningTranslationKey,
      }
    : {
        ...previousState,
        confirmButtonEnabled: false,
        fees: [],
        status: 'Form' as const,
        txBuildErrorTranslationKey: result.errorTranslationKey,
      };

export const txPreviewResulted = (
  previousState: TxHandlersStateOpen,
  { result }: { result: TxPreviewResult },
) =>
  result.success && result.minimumAmount !== previousState.minimumAmount
    ? {
        ...previousState,
        minimumAmount: result.minimumAmount,
        status: 'FormPendingValidation' as const,
      }
    : previousState;
