import type {
  ActivityAssetProp,
  ActivityStatus,
  ActivityType,
  RewardsActivityType,
  TransactionActivityType
} from '@lace/core';

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
   * Activity status: `sending` | `success` | 'error
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
  direction?: 'Incoming' | 'Outgoing' | 'Self';
  /**
   * assets details
   */
  assets?: ActivityAssetProp[];
};

export type TransformedTransactionActivity = TransformedActivity & { type: TransactionActivityType };

export type TransformedRewardsActivity = TransformedActivity & { type: RewardsActivityType };
