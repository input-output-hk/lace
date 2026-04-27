import { convertAmountToDenominated } from '@lace-lib/util-render';

import type { NativeTokenInfo } from '../../hooks/useFeeToken';

type FeeLike = {
  tokenId: string;
  amount?: { toString(): string };
};

export type GetFeeDisplayStringParams = {
  firstFee: FeeLike | undefined;
  firstToken: { tokenId: string };
  nativeTokenInfo?: NativeTokenInfo;
};

/**
 * Builds the fee display string (e.g. "0.25 ADA") from the first fee entry
 * and native token info provided by the blockchain module.
 */
export const getFeeDisplayString = (
  params: GetFeeDisplayStringParams,
): string => {
  const { firstFee, firstToken, nativeTokenInfo } = params;
  const feeTokenId = firstFee?.tokenId ?? firstToken.tokenId;
  const feeAmount = firstFee?.amount?.toString() ?? '0';
  const feeDecimals = nativeTokenInfo?.decimals ?? 0;
  const feeTokenName = nativeTokenInfo?.displayShortName ?? feeTokenId;
  const feeString = convertAmountToDenominated(feeAmount, feeDecimals);
  return `${feeString} ${feeTokenName}`;
};
