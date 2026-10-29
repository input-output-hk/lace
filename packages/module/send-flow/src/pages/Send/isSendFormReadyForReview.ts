import { BigNumber } from '@lace-lib/util';
import { parseLocaleNumber, rawToBigInt } from '@lace-lib/util-render';

import type { SendFlowSliceState } from '@lace-contract/send-flow';

type LocalSendForm = {
  recipientAddress: string;
  note: string | undefined;
  assetInputValues: { tokenId: string; value: string }[];
};

export const isSendFormReadyForReview = (
  state: SendFlowSliceState,
  localForm: LocalSendForm,
): boolean => {
  if (
    state.status !== 'Form' ||
    !state.confirmButtonEnabled ||
    !state.serializedTx
  ) {
    return false;
  }

  const memo = (state.form.blockchainSpecific?.value as { memo?: string })
    ?.memo;
  return (
    state.form.address.value === localForm.recipientAddress &&
    (memo ?? '') === (localForm.note ?? '') &&
    state.form.tokenTransfers.every(transfer => {
      const input = localForm.assetInputValues.find(
        entry => entry.tokenId === transfer.token.value.tokenId,
      );
      // Untouched rows display the state-machine amount directly.
      if (!input) return true;
      return (
        rawToBigInt(
          parseLocaleNumber(input.value),
          transfer.token.value.decimals || 0,
        ) === BigNumber.valueOf(transfer.amount.value)
      );
    })
  );
};
