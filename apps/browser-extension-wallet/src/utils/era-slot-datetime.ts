/* eslint-disable consistent-return */
import { EraSummary } from '@cardano-sdk/core';
import { Wallet } from '@lace/cardano';
import { formatDate, formatTime } from './format-date';

export const eraSlotDateTime = (
  eraSummaries: EraSummary[] | undefined,
  slot: Wallet.Cardano.Slot | undefined
): { utcDate: string; utcTime: string } | undefined => {
  if (!eraSummaries || !slot) {
    return undefined;
  }
  const slotTimeCalc = Wallet.createSlotTimeCalc(eraSummaries);
  const date = slotTimeCalc(slot);
  return {
    utcDate: formatDate({ date, format: 'MM/DD/YYYY', type: 'utc' }),
    utcTime: formatTime({ date, type: 'utc' })
  };
};
