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
  /** Omitted when no vote-delegation destination exists (governance center disabled) — hides the button. */
  onDelegateVote?: () => void;
  /**
   * Overrides the vote-delegation CTA's label. The consumer knows where the
   * press leads — for the audience it reroutes into the earn-rewards flow, and
   * the button should read as that outcome rather than the mechanism.
   */
  delegateVoteLabel?: string;
  /** External (gov.tools) alternative, rendered under the primary vote CTA;
   * omitted when the host has no in-app dApp browser — hides the button. */
  externalDelegateVote?: { label: string; onPress: () => void };
}

interface OtherPoolStatusSheetProps extends BasePoolStatusSheetProps {
  state: 'high-saturation' | 'pledge-not-met' | 'retiring';
  onDelegateVote?: never;
  externalDelegateVote?: never;
}

export type PoolStatusSheetProps =
  | LockedRewardsPoolStatusSheetProps
  | OtherPoolStatusSheetProps;
