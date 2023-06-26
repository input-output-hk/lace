import { Wallet } from '@lace/cardano';

export enum AnalyticsEventActions {
  CLICK_EVENT = 'click-event',
  HOVER_EVENT = 'hover-event'
}

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

export type SendEventProps = {
  category: AnalyticsEventCategories;
  action: AnalyticsEventActions;
  name: string;
  value?: number;
};

export interface AnalyticsClient {
  sendPageNavigationEvent(href: string): void;
  sendEvent(props: SendEventProps): void;
  setOptedInForEnhancedAnalytics(status: EnhancedAnalyticsOptInStatus): void;
  setSiteId(chain: Wallet.Cardano.ChainId): void;
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
