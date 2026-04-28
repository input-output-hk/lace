export type PoolStatusState =
  | 'high-saturation'
  | 'locked-rewards'
  | 'pledge-not-met'
  | 'retiring';

interface BasePoolStatusSheetProps {
  // Pool info
  poolName: string;
  poolTicker: string;

  // Amounts
  totalStaked: string;
  totalRewards: string;
  coin: string;

  // Warning messages
  primaryWarningMessage?: string; // Message shown below pool ticker
  saturationWarningMessage?: string; // Message shown below saturation bar

  // Stake key and saturation
  stakeKey?: string;
  saturationPercentage: number;

  // Button labels and actions
  primaryButtonLabel?: string;
  secondaryButtonLabel?: string;
  isSecondaryButtonDisabled?: boolean;
  onPrimaryPress?: () => void;
  onSecondaryPress?: () => void;
}

interface LockedRewardsPoolStatusSheetProps extends BasePoolStatusSheetProps {
  state: 'locked-rewards';
  onDelegateVote: () => void;
}

interface OtherPoolStatusSheetProps extends BasePoolStatusSheetProps {
  state: 'high-saturation' | 'pledge-not-met' | 'retiring';
  onDelegateVote?: never;
}

export type PoolStatusSheetProps =
  | LockedRewardsPoolStatusSheetProps
  | OtherPoolStatusSheetProps;
