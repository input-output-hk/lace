import { Cardano } from '@cardano-sdk/core';
import { BigNumber } from '@lace-lib/util';
import { formatAmountRawToDenominated } from '@lace-lib/util-render';

import { LOVELACE_TOKEN_ID } from './const';
import { convertLovelacesToAda } from './util';

import type { ActivityTokenBalanceChange } from '@lace-contract/activities';

/**
 * Returns the display amount for a token balance change. For lovelace,
 * adds the fee back when the delta is negative so the displayed amount
 * reflects what the account sent/received — the fee is shown on its own
 * row and would otherwise be double-counted.
 */
export const formatTokenBalanceChangeAmount = (
  change: ActivityTokenBalanceChange,
  fee: string | undefined,
): string => {
  if (change.tokenId === LOVELACE_TOKEN_ID) {
    const amountBigInt = BigNumber.valueOf(change.amount);
    const feeAdjustedAmount =
      amountBigInt < 0n && fee ? amountBigInt + BigInt(fee) : amountBigInt;
    return convertLovelacesToAda(feeAdjustedAmount);
  }
  return formatAmountRawToDenominated(
    change.amount.toString(),
    change.token?.decimals,
    change.token?.displayDecimalPlaces,
  );
};

/**
 * Returns the display symbol for a token balance change: native coin
 * symbol for lovelace, token ticker/name when available, otherwise the
 * asset fingerprint, falling back to `unknownTickerLabel` for malformed ids.
 */
export const formatTokenBalanceChangeSymbol = (
  change: ActivityTokenBalanceChange,
  nativeCoinSymbol: string,
  unknownTickerLabel: string,
): string => {
  if (change.tokenId === LOVELACE_TOKEN_ID) return nativeCoinSymbol;
  if (change.token?.ticker) return change.token.ticker;
  if (change.token?.name) return change.token.name;
  try {
    const assetId = Cardano.AssetId(change.tokenId);
    return Cardano.AssetFingerprint.fromParts(
      Cardano.AssetId.getPolicyId(assetId),
      Cardano.AssetId.getAssetName(assetId),
    ).toString();
  } catch {
    return unknownTickerLabel;
  }
};
