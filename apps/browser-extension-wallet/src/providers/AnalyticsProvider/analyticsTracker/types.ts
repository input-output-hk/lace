/* eslint-disable camelcase */
export { PostHogAction } from '@lace/common';
export type { IAnalyticsTracker } from '@lace/common';

export enum EnhancedAnalyticsOptInStatus {
  OptedIn = 'ACCEPTED',
  OptedOut = 'REJECTED',
  NotSet = 'NOT_SET'
}

export enum UserTrackingType {
  Enhanced = 'enhanced',
  Basic = 'basic'
}

export enum ExtensionViews {
  Extended = 'extended',
  Popup = 'popup'
}

export enum TxRecipientType {
  AdaHandle = 'ADA Handle',
  RegularAddress = 'regular address'
}

export const TX_CREATION_TYPE_KEY = 'tx_creation_type';

export enum TxCreationType {
  Internal = 'internal',
  External = 'external'
}

export type PostHogPersonProperties = {
  $set: {
    user_tracking_type: UserTrackingType;
  };
};
export type PostHogMetadata = {
  distinct_id?: string;
  alias_id?: string;
  view: ExtensionViews;
  sent_at_local: string;
  posthog_project_id: number;
} & PostHogPersonProperties;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PostHogProperty = string | boolean | Record<string, any> | Array<Record<string, any>>;
export type PostHogProperties = Record<string, PostHogProperty>;
