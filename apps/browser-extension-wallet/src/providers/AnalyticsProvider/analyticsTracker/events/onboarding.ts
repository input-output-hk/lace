/* eslint-disable sonarjs/no-duplicate-string */
import { ExtractActionsAsUnion, ValidateOnboardingActionsStructure } from './types';

export type PostHogOnboardingActions = typeof onboardingActions;
export type PostHogOnboardingAction = ExtractActionsAsUnion<PostHogOnboardingActions>;

const makeOnboardingEvent = <E extends string>(eventSuffix: E) => `onboarding | ${eventSuffix}` as const;
const makeOnboardingCreateEvent = <E extends string>(eventSuffix: E) =>
  `onboarding | new wallet revamp | ${eventSuffix}` as const;
const makeOnboardingRestoreEvent = <E extends string>(eventSuffix: E) =>
  `onboarding | restore wallet revamp | ${eventSuffix}` as const;
const makeOnboardingHardwareEvent = <E extends string>(eventSuffix: E) =>
  `onboarding | hardware wallet revamp | ${eventSuffix}` as const;
const makeForgotPasswordEvent = <E extends string>(eventSuffix: E) =>
  `unlock wallet | forgot password? | ${eventSuffix}` as const;
const makePaperWalletOnboardingCreateEvent = <E extends string>(eventSuffix: E) =>
  `onboarding | new wallet revamp paper wallet | ${eventSuffix}` as const;
const makePaperWalletOnboardingRestoreEvent = <E extends string>(eventSuffix: E) =>
  `onboarding | restore wallet revamp paper wallet | ${eventSuffix}` as const;

const onboardingActions = {
  onboarding: {
    ANALYTICS_AGREE_CLICK: makeOnboardingEvent('analytics banner | agree | click'),
    ANALYTICS_REJECT_CLICK: makeOnboardingEvent('analytics banner | reject | click'),
    LEARN_MORE_CLICK: makeOnboardingEvent('analytics banner | learn more | click'),
    GOT_IT_CLICK: makeOnboardingEvent('help us improve your experience | got it | click'),
    PIN_EXTENSION_CLICK: makeOnboardingEvent('lace main view | pin the wallet extension | click')
  },
  create: {
    CHOOSE_RECOVERY_MODE_MNEMONIC_CLICK: makePaperWalletOnboardingCreateEvent('choose mode | recovery phrase | click'),
    CHOOSE_RECOVERY_MODE_PAPER_CLICK: makePaperWalletOnboardingCreateEvent('choose mode | paper wallet | click'),
    CHOOSE_RECOVERY_MODE_NEXT_CLICK: makePaperWalletOnboardingCreateEvent('choose mode | next | click'),
    PGP_PUBLIC_KEY_PAGE_VIEW: makePaperWalletOnboardingCreateEvent('step: pgp key | pageview'),
    PGP_PUBLIC_KEY_NEXT_CLICK: makePaperWalletOnboardingCreateEvent('step: pgp key | next | click'),
    WALLET_SETUP_GENERATE_PAPER_WALLET_CLICK: makePaperWalletOnboardingCreateEvent(
      'step: wallet info | Generate paper wallet | click'
    ),
    PAPER_WALLET_DOWNLOAD_PAGEVIEW: makePaperWalletOnboardingCreateEvent('step: download pdf | pageview'),
    DOWNLOAD_PAPER_WALLET_CLICK: makePaperWalletOnboardingCreateEvent('download pdf | download pdf | click'),
    PRINT_PAPER_WALLET_CLICK: makePaperWalletOnboardingCreateEvent('print pdf | print pdf | click'),
    PAPER_WALLET_COMPLETE_CLICK: makePaperWalletOnboardingCreateEvent('open wallet | open wallet | click'),
    SETUP_OPTION_CLICK: makeOnboardingCreateEvent('create | click'),
    SAVE_RECOVERY_PHRASE_NEXT_CLICK: makeOnboardingCreateEvent('save your recovery phrase | next | click'),
    ENTER_RECOVERY_PHRASE_NEXT_CLICK: makeOnboardingCreateEvent('enter your recovery phrase | next | click'),
    ENTER_WALLET: makeOnboardingCreateEvent("let's set up your new wallet | enter wallet | click"),
    RECOVERY_PHRASE_INTRO_WATCH_VIDEO_CLICK: makeOnboardingCreateEvent(
      'save your recovery phrase | watch video | click'
    ),
    RECOVERY_PHRASE_INTRO_VIDEO_GOTIT_CLICK: makeOnboardingCreateEvent('keeping your wallet secure | got it | click'),
    RECOVERY_PHRASE_COPY_TO_CLIPBOARD_CLICK: makeOnboardingCreateEvent(
      'save your recovery phrase | copy to clipboard | click'
    ),
    RECOVERY_PHRASE_PASTE_FROM_CLIPBOARD_CLICK: makeOnboardingCreateEvent(
      'enter your recovery phrase | paste from clipboard | click'
    ),
    RECOVERY_PHRASE_COPY_READ_MORE_CLICK: makeOnboardingCreateEvent(
      'save your recovery phrase | best practices faq | click'
    ),
    RECOVERY_PHRASE_PASTE_READ_MORE_CLICK: makeOnboardingCreateEvent(
      'enter your recovery phrase | best practices faq | click'
    ),
    WALLET_ADDED: makeOnboardingCreateEvent('added')
  },
  restore: {
    WALLET_SETUP_PAGEVIEW: makePaperWalletOnboardingCreateEvent('step: wallet info | pageview'),
    CHOOSE_RECOVERY_MODE_MNEMONIC_CLICK: makePaperWalletOnboardingRestoreEvent('choose mode | recovery phrase | click'),
    CHOOSE_RECOVERY_MODE_PAPER_CLICK: makePaperWalletOnboardingRestoreEvent('choose mode | paper wallet | click'),
    CHOOSE_RECOVERY_MODE_NEXT_CLICK: makePaperWalletOnboardingRestoreEvent('choose mode | next | click'),
    SCAN_QR_CODE_PAGEVIEW: makePaperWalletOnboardingRestoreEvent('step: scan qr code | pageview'),
    SCAN_QR_CODE_CAMERA_OK: makePaperWalletOnboardingRestoreEvent('step: scan qr code | camera ok'),
    SCAN_QR_CODE_CAMERA_ERROR: makePaperWalletOnboardingRestoreEvent('step: scan qr code | camera error'),
    SCAN_QR_CODE_READ_SUCCESS: makePaperWalletOnboardingRestoreEvent('step: scan qr code | read success'),
    SCAN_QR_CODE_READ_ERROR: makePaperWalletOnboardingRestoreEvent('step: scan qr code | read error'),
    WALLET_OVERVIEW_NEXT_CLICK: makePaperWalletOnboardingRestoreEvent('step: wallet overview | next | click'),
    ENTER_PGP_PRIVATE_KEY_PAGE_VIEW: makePaperWalletOnboardingRestoreEvent('step: pgp private key | pageview'),
    ENTER_PGP_PRIVATE_KEY_NEXT_CLICK: makePaperWalletOnboardingRestoreEvent('step: pgp private key | next | click'),
    SETUP_OPTION_CLICK: makeOnboardingRestoreEvent('restore | click'),
    ENTER_WALLET: makeOnboardingRestoreEvent("let's set up your new wallet | enter wallet | click"),
    ENTER_RECOVERY_PHRASE_NEXT_CLICK: makeOnboardingRestoreEvent(' enter your recovery phrase  | next | click'),
    RECOVERY_PHRASE_PASTE_FROM_CLIPBOARD_CLICK: makeOnboardingRestoreEvent(
      'enter your recovery phrase | paste from clipboard | click'
    ),
    RECOVERY_PHRASE_PASTE_READ_MORE_CLICK: makeOnboardingRestoreEvent(
      'enter your recovery phrase | best practices faq | click'
    ),
    WALLET_ADDED: makeOnboardingRestoreEvent('added'),
    HD_WALLET: makeOnboardingRestoreEvent('hd wallet')
  },
  hw: {
    SETUP_OPTION_CLICK: makeOnboardingHardwareEvent('connect | click'),
    CONNECT_HW_VIEW: makeOnboardingHardwareEvent('connect your device | view'),
    HW_POPUP_CONNECT_CLICK: makeOnboardingHardwareEvent('native browser pop-up with HWs | connect | click'),
    CONNECT_HW_TRY_AGAIN_CLICK: makeOnboardingHardwareEvent('connect your device | try again | click'),
    SETUP_HW_ACCOUNT_NO_CLICK: makeOnboardingHardwareEvent("let's set up your wallet | Account No | click"),
    ENTER_WALLET: makeOnboardingHardwareEvent("let's set up your wallet | enter wallet | click"),
    WALLET_ADDED: makeOnboardingHardwareEvent('added'),
    HD_WALLET: makeOnboardingHardwareEvent('hd wallet')
  },
  // eslint-disable-next-line camelcase
  forgot_password: {
    ENTER_RECOVERY_PHRASE_NEXT_CLICK: makeForgotPasswordEvent('enter your recovery phrase | next | click'),
    ENTER_WALLET: makeForgotPasswordEvent('set up your password | enter wallet | click'),
    RECOVERY_PHRASE_PASTE_FROM_CLIPBOARD_CLICK: makeForgotPasswordEvent(
      'enter your recovery phrase | paste from clipboard | click'
    )
  }
};

export const postHogOnboardingActions: ValidateOnboardingActionsStructure<PostHogOnboardingActions> = onboardingActions;
