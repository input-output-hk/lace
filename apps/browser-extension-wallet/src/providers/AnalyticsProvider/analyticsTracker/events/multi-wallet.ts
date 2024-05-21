import { ExtractActionsAsUnion, ValidateMultiWalletActionsStructure } from './types';

export type PostHogMultiWalletActions = typeof multiWalletActions;
export type PostHogMultiWalletAction = ExtractActionsAsUnion<PostHogMultiWalletActions>;

const makeMultiWalletCreateEvent = <E extends string>(eventSuffix: E) =>
  `multiwallet | new wallet revamp | ${eventSuffix}` as const;
const makeMultiWalletRestoreEvent = <E extends string>(eventSuffix: E) =>
  `multiwallet | restore wallet revamp | ${eventSuffix}` as const;
const makeMultiWalletHardwareEvent = <E extends string>(eventSuffix: E) =>
  `multiwallet | hardware wallet revamp | ${eventSuffix}` as const;

const multiWalletActions = {
  create: {
    SETUP_OPTION_CLICK: makeMultiWalletCreateEvent('create | click'),
    SAVE_RECOVERY_PHRASE_NEXT_CLICK: makeMultiWalletCreateEvent('save your recovery phrase | next | click'),
    ENTER_RECOVERY_PHRASE_NEXT_CLICK: makeMultiWalletCreateEvent('enter your recovery phrase | next | click'),
    ENTER_WALLET: makeMultiWalletCreateEvent("let's set up your new wallet | enter wallet | click"),
    RECOVERY_PHRASE_INTRO_WATCH_VIDEO_CLICK: makeMultiWalletCreateEvent(
      'save your recovery phrase | watch video | click'
    ),
    RECOVERY_PHRASE_INTRO_VIDEO_GOTIT_CLICK: makeMultiWalletCreateEvent('keeping your wallet secure | got it | click'),
    RECOVERY_PHRASE_COPY_TO_CLIPBOARD_CLICK: makeMultiWalletCreateEvent(
      'save your recovery phrase | copy to clipboard | click'
    ),
    RECOVERY_PHRASE_PASTE_FROM_CLIPBOARD_CLICK: makeMultiWalletCreateEvent(
      'enter your recovery phrase | paste from clipboard | click'
    ),
    RECOVERY_PHRASE_COPY_READ_MORE_CLICK: makeMultiWalletCreateEvent(
      'save your recovery phrase | best practices faq | click'
    ),
    RECOVERY_PHRASE_PASTE_READ_MORE_CLICK: makeMultiWalletCreateEvent(
      'enter your recovery phrase | best practices faq | click'
    ),
    WALLET_ADDED: makeMultiWalletCreateEvent('added')
  },
  restore: {
    SETUP_OPTION_CLICK: makeMultiWalletRestoreEvent('restore | click'),
    ENTER_WALLET: makeMultiWalletRestoreEvent("let's set up your new wallet | enter wallet | click"),
    ENTER_RECOVERY_PHRASE_NEXT_CLICK: makeMultiWalletRestoreEvent(' enter your recovery phrase  | next | click'),
    RECOVERY_PHRASE_PASTE_FROM_CLIPBOARD_CLICK: makeMultiWalletRestoreEvent(
      'enter your recovery phrase | paste from clipboard | click'
    ),
    RECOVERY_PHRASE_PASTE_READ_MORE_CLICK: makeMultiWalletRestoreEvent(
      'enter your recovery phrase | best practices faq | click'
    ),
    WALLET_ADDED: makeMultiWalletRestoreEvent('added'),
    HD_WALLET: makeMultiWalletRestoreEvent('hd wallet')
  },
  hardware: {
    SETUP_OPTION_CLICK: makeMultiWalletHardwareEvent('connect | click'),
    CONNECT_HW_VIEW: makeMultiWalletHardwareEvent('connect your device | view'),
    HW_POPUP_CONNECT_CLICK: makeMultiWalletHardwareEvent('native browser pop-up with HWs | connect | click'),
    CONNECT_HW_TRY_AGAIN_CLICK: makeMultiWalletHardwareEvent('connect your device | try again | click'),
    SETUP_HW_ACCOUNT_NO_CLICK: makeMultiWalletHardwareEvent("let's set up your wallet | Account No | click"),
    ENTER_WALLET: makeMultiWalletHardwareEvent("let's set up your wallet | enter wallet | click"),
    WALLET_ADDED: makeMultiWalletHardwareEvent('added'),
    HD_WALLET: makeMultiWalletHardwareEvent('hd wallet')
  }
};

export const postHogMultiWalletActions: ValidateMultiWalletActionsStructure<PostHogMultiWalletActions> =
  multiWalletActions;
