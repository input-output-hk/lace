import { isSendFlowSuccess } from '@lace-contract/send-flow';
import { convertAmountToDenominated } from '@lace-lib/util-render';

import { getFeeDisplayString } from './getFeeDisplayString';

import type { NativeTokenInfo } from '../../hooks/useFeeToken';
import type { SendFlowSliceState } from '@lace-contract/send-flow';

export type { NativeTokenInfo } from '../../hooks/useFeeToken';

export type TransactionDetails = {
  sentTokens: Array<{
    token: {
      tokenId: string;
      displayShortName: string;
      decimals?: number;
      metadata?: { image?: string };
    };
    amount: string;
  }>;
  recipientAddress: string;
  fee: string;
};

export const getTransactionDetails = (
  sendFlowState: SendFlowSliceState,
  options?: { nativeTokenInfo?: NativeTokenInfo },
): TransactionDetails | undefined => {
  if (!isSendFlowSuccess(sendFlowState)) return undefined;
  const { form, fees } = sendFlowState;
  if (!form?.tokenTransfers?.length || !form?.address?.value) return undefined;

  const sentTokens = form.tokenTransfers.map(transfer => {
    const token = transfer.token.value;
    const decimals = token.decimals ?? 0;
    const amount = convertAmountToDenominated(
      transfer.amount.value.toString(),
      decimals,
    );
    return {
      token: {
        tokenId: token.tokenId,
        displayShortName: token.displayShortName,
        decimals: token.decimals,
        metadata: token.metadata,
      },
      amount,
    };
  });

  const resolved = form.address.resolvedAddress;
  const recipientAddress =
    (typeof resolved === 'string' ? resolved : null) ?? form.address.value;

  const firstTransfer = form.tokenTransfers[0];
  const firstToken = firstTransfer.token.value;
  const firstFee = fees[0];
  const fee = getFeeDisplayString({
    firstFee,
    firstToken,
    nativeTokenInfo: options?.nativeTokenInfo,
  });

  return {
    sentTokens,
    recipientAddress,
    fee,
  };
};
