import { ExtractActionsAsUnion, ValidateMultiWalletActionsStructure } from './types';

export type PostHogMultiWalletActions = typeof multiWalletActions;
export type PostHogMultiWalletAction = ExtractActionsAsUnion<PostHogMultiWalletActions>;

const makeMultiWalletCreateEvent = <E extends string>(eventSuffix: E) =>
  `multiwallet | new wallet revamp | ${eventSuffix}` as const;
const makeMultiWalletRestoreEvent = <E extends string>(eventSuffix: E) =>
  `multiwallet | restore wallet revamp | ${eventSuffix}` as const;
const makeMultiWalletHardwareEvent = <E extends string>(eventSuffix: E) =>
  `multiwallet | hardware wallet revamp | ${eventSuffix}` as const;
const makePaperWalletOnboardingCreateEvent = <E extends string>(eventSuffix: E) =>
  `onboarding | new wallet revamp paper wallet | ${eventSuffix}` as const;
const makePaperWalletOnboardingRestoreEvent = <E extends string>(eventSuffix: E) =>
  `onboarding | restore wallet revamp paper wallet | ${eventSuffix}` as const;

const multiWalletActions = {
  create: {
    CHOOSE_RECOVERY_MODE_MNEMONIC_CLICK: makePaperWalletOnboardingCreateEvent('choose mode | recovery phrase | click'), // done
    CHOOSE_RECOVERY_MODE_PAPER_CLICK: makePaperWalletOnboardingCreateEvent('choose mode | paper wallet | click'), // done
    CHOOSE_RECOVERY_MODE_NEXT_CLICK: makePaperWalletOnboardingCreateEvent('choose mode | next | click'), // done
    PGP_PUBLIC_KEY_NEXT_CLICK: makePaperWalletOnboardingCreateEvent('step: pgp key | next | click'), // done
    WALLET_SETUP_GENERATE_PAPER_WALLET_CLICK: makePaperWalletOnboardingCreateEvent(
      ' step: wallet info | Generate paper wallet | click'
    ), // done
    DOWNLOAD_PAPER_WALLET_CLICK: makePaperWalletOnboardingCreateEvent(' download pdf | download pdf | click'), // done
    PRINT_PAPER_WALLET_CLICK: makePaperWalletOnboardingCreateEvent('print pdf | print pdf | click'), // done
    PAPER_WALLET_COMPLETE_CLICK: makePaperWalletOnboardingCreateEvent(' open wallet | open wallet | click'), // done
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
    CHOOSE_RECOVERY_MODE_MNEMONIC_CLICK: makePaperWalletOnboardingRestoreEvent('choose mode | recovery phrase | click'),
    CHOOSE_RECOVERY_MODE_PAPER_CLICK: makePaperWalletOnboardingRestoreEvent('choose mode | paper wallet | click'),
    CHOOSE_RECOVERY_MODE_NEXT_CLICK: makePaperWalletOnboardingRestoreEvent('choose mode | next | click'),
    SCAN_QR_CODE_CAMERA_OK: makePaperWalletOnboardingRestoreEvent('step: scan qr code | camera ok'),
    SCAN_QR_CODE_CAMERA_ERROR: makePaperWalletOnboardingRestoreEvent('step: scan qr code | camera error'),
    SCAN_QR_CODE_READ_SUCCESS: makePaperWalletOnboardingRestoreEvent('step: scan qr code | read success'),
    SCAN_QR_CODE_READ_ERROR: makePaperWalletOnboardingRestoreEvent('step: scan qr code | read error'),
    WALLET_OVERVIEW_NEXT_CLICK: makePaperWalletOnboardingRestoreEvent('step: wallet overview | next | click'),
    ENTER_PGP_PRIVATE_KEY_NEXT_CLICK: makePaperWalletOnboardingRestoreEvent('step: pgp private key | next | click'),
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
