import { PostHogActions } from '@providers/AnalyticsProvider/analyticsTracker';

export type SetFormDirty = (dirty: boolean) => void;

export type Flows = 'create' | 'restore' | 'hardware';

export type WalletOnboardingPostHogActions = Record<Flows, PostHogActions>;
