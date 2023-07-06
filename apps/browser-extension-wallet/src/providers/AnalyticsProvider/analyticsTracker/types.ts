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

export type Metadata = {
  _id?: string;
  cookie?: number;
  url: string;
};

export enum PostHogAction {
  ActionName = 'flow | subflow | view | object | interaction'
}

export enum PostHogFlows {
  Onboarding = 'onboarding'
}

export enum EnhancedAnalyticsOptInStatus {
  OptedIn = 'ACCEPTED',
  OptedOut = 'REJECTED'
}

export enum ExtensionViews {
  Extended = 'extended',
  Popup = 'popup'
}

export type PostHogMetadata = {
  // eslint-disable-next-line camelcase
  distinct_id?: string;
  url: string;
  view: ExtensionViews;
};
