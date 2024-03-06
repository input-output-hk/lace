import type { ActivityAssetProp, ActivityStatus, ActivityType, TransactionActivityType } from '@lace/core';
import { TxDirection } from '@src/types';

export type TransformedActivity = {
  id?: string;
  fee?: string;
  deposit?: string; // e.g. stake registrations
  depositReclaim?: string; // e.g. stake de-registrations
  /**
   * Amount formated with symbol (e.g. 50 ADA)
   */
  amount: string;
  /**
   * Date of the activity
   */
  date: Date;
  /**
   * Amount in Fiat currency (e.g. 125$)
   */
  fiatAmount: string;
  /**
   * Activity status: `sending` | `success` | 'error' | 'spendable'
   */
  status?: ActivityStatus;
  /**
   * Activity or asset custom icon
   */
  customIcon?: string;
  /**
   * Activity type
   */
  type?: ActivityType;
  /**
   * Number of assets (default: 1)
   */
  assetsNumber?: number;
  formattedDate: string;
  formattedTimestamp: string;
  /**
   * Direction: 'Incoming' | 'Outgoing' | 'Self'
   * TODO: Create a separate package for common types across apps/packages
   */
  direction?: TxDirection;
  /**
   * assets details
   */
  assets?: ActivityAssetProp[];
};

export type TransformedTransactionActivity = TransformedActivity & {
  type: Exclude<ActivityType, TransactionActivityType.rewards>;
};

export type TransformedRewardsActivity = TransformedActivity & { type: TransactionActivityType.rewards };
