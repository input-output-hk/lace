import type { AccountId } from '@lace-contract/wallet-repo';
import type { Tagged } from 'type-fest';

export type RealFiPositionId = Tagged<string, 'RealFiPositionId'>;
/** One RealFi position per Cardano account. */
export const RealFiPositionId = (accountId: AccountId): RealFiPositionId =>
  `realfi-position-${accountId}` as RealFiPositionId;
