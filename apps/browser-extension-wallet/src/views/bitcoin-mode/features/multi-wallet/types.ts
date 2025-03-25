import { PostHogMultiWalletActions, PostHogOnboardingActions } from '@providers/AnalyticsProvider/analyticsTracker';

export type SetFormDirty = (dirty: boolean) => void;

export type Flows = 'create' | 'restore' | 'hardware';

export type WalletOnboardingPostHogActions =
  | PostHogMultiWalletActions
  | (Pick<PostHogOnboardingActions, 'create' | 'restore'> & Record<'hardware', PostHogOnboardingActions['hw']>);

export type RecoveryMethod = 'paper' | 'mnemonic';
