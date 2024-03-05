/* eslint-disable camelcase */
import { PostHogAction } from '@lace/common';

export { PostHogAction } from '@lace/common';
export type { IAnalyticsTracker } from '@lace/common';

export type Metadata = {
  _id?: string;
  cookie?: number;
  url: string;
};

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

export type OnboardingFlows = 'create' | 'restore' | 'hw' | 'forgot_password' | 'landing';
export type PostHogActionsKeys =
  | 'SETUP_OPTION_CLICK'
  | 'ANALYTICS_AGREE_CLICK'
  | 'ANALYTICS_REJECT_CLICK'
  | 'LACE_TERMS_OF_USE_NEXT_CLICK'
  | 'WALLET_NAME_NEXT_CLICK'
  | 'WALLET_PASSWORD_NEXT_CLICK'
  | 'SAVE_RECOVERY_PHRASE_NEXT_CLICK'
  | 'ENTER_WALLET'
  | 'ENTER_PASSPHRASE_01_NEXT_CLICK'
  | 'ENTER_PASSPHRASE_09_NEXT_CLICK'
  | 'ENTER_PASSPHRASE_17_NEXT_CLICK'
  | 'RESTORE_MULTI_ADDR_OK_CLICK'
  | 'RESTORE_MULTI_ADDR_CANCEL_CLICK'
  | 'RECOVERY_PASSPHRASE_LENGTH_NEXT_CLICK'
  | 'CONNECT_HW_NEXT_CLICK'
  | 'SETUP_HW_WALLET_NEXT_CLICK'
  | 'DONE_GO_TO_WALLET'
  | 'WALLET_NAME_PASSWORD_NEXT_CLICK'
  | 'RECOVERY_PHRASE_INTRO_WATCH_VIDEO_CLICK'
  | 'RECOVERY_PHRASE_INTRO_VIDEO_GOTIT_CLICK'
  | 'RECOVERY_PHRASE_COPY_TO_CLIPBOARD_CLICK'
  | 'RECOVERY_PHRASE_PASTE_FROM_CLIPBOARD_CLICK';
export type PostHogOnboardingActionsValueType = Partial<Record<PostHogActionsKeys, PostHogAction>>;
export type PostHogOnboardingActionsType = Partial<Record<OnboardingFlows, PostHogOnboardingActionsValueType>>;
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
