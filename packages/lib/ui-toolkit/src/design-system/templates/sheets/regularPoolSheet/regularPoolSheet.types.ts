import type { ColorType } from '../../..';
import type { IconName } from '../../../atoms';

export type RegularPoolSheetProps = {
  // Pool info
  poolName: string;
  poolTicker: string;

  // Amounts
  totalStaked: string;
  totalRewards: string;
  coin: string;

  // Stake key
  stakeKey: string;

  // Saturation
  saturationPercentage: number;

  // Pool statistics
  activeStake: string;
  liveStake: string;
  delegators: string;
  blocks: string;
  costPerEpoch: string;
  pledge: string;
  poolMargin: string;
  ros: string;

  // Information
  information: string;

  // Epochs data
  epochs: Array<{ epoch: string; progress: number }>;
  epochsScale?: number[];
  epochsFilterOptions?: number[];
  selectedEpochFilter?: number;
  onEpochFilterChange: (index: number) => void;

  // Activity history (grouped by date)
  activitySections: Array<{
    date: string;
    dateIcon?: IconName;
    items: Array<{
      id: string;
      /** Unique across activities: `${txId}-${ActivityType}` (see formatAndGroupActivitiesByDate). */
      rowKey: string;
      title: string;
      subtitle: string;
      amount: string;
      coin: string;
      iconName: IconName;
      iconBackground: ColorType;
    }>;
  }>;

  // Buttons (optional - only show if provided)
  primaryButtonLabel?: string;
  secondaryButtonLabel?: string;
  onPrimaryPress?: () => void;
  onSecondaryPress?: () => void;
  isSecondaryButtonDisabled?: boolean;
  onActivityPress?: (id: string) => void;
  isLoadingActivities?: boolean;
};
