// TODO: rename to MatomoEventActions (https://input-output.atlassian.net/browse/LW-7197)
export enum AnalyticsEventActions {
  CLICK_EVENT = 'click-event',
  HOVER_EVENT = 'hover-event'
}

// TODO: rename to MatomoEventCategories (https://input-output.atlassian.net/browse/LW-7197)
export enum AnalyticsEventCategories {
  SEND_TRANSACTION = 'send-transaction',
  WALLET_CREATE = 'wallet-create',
  WALLET_RESTORE = 'wallet-restore',
  HW_CONNECT = 'hw-connect',
  VIEW_TOKENS = 'view-tokens',
  VIEW_NFT = 'view-nft',
  ADDRESS_BOOK = 'address-book',
  VIEW_TRANSACTIONS = 'view-transactions',
  STAKING = 'staking'
}

// TODO: rename to MatomoSendEventProps (https://input-output.atlassian.net/browse/LW-7197)
export type SendEventProps = {
  category: AnalyticsEventCategories;
  action: AnalyticsEventActions;
  name: string;
  value?: number;
};

export enum PostHogAction {
  // Hardware wallet connect
  OnboardingHWAnalyticsAgreeClick = 'onboarding | hardware wallet | analytics | agree | click',
  OnboardingHWAnalyticsSkipClick = 'onboarding | hardware wallet | analytics | skip | click',
  // Restore wallet
  OnboardingRestoreAnalyticsAgreeClick = 'onboarding | restore wallet | analytics | agree | click',
  OnboardingRestoreAnalyticsSkipClick = 'onboarding | restore wallet | analytics | skip | click',
  // Create new wallet
  OnboardingCreateAnalyticsAgreeClick = 'onboarding | new wallet | analytics | agree | click',
  OnboardingCreateAnalyticsSkipClick = 'onboarding | new wallet | analytics | skip | click'
}

export enum EnhancedAnalyticsOptInStatus {
  OptedIn = 'ACCEPTED',
  OptedOut = 'REJECTED'
}

export type Metadata = {
  _id?: string;
  cookie?: number;
  url: string;
};

export enum ExtensionViews {
  Extended = 'extended',
  Popup = 'popup'
}
export type OnboardingFlows = 'create' | 'restore' | 'hw' | 'forgot_password';
export type PostHogActionsKeys = 'ANALYTICS_AGREE_CLICK' | 'ANALYTICS_SKIP_CLICK';
export type PostHogOnboardingActionsValueType = Partial<Record<PostHogActionsKeys, PostHogAction>>;
export type PostHogOnboardingActionsType = Partial<Record<OnboardingFlows, PostHogOnboardingActionsValueType>>;
