import { PostHogAction, PostHogOnboardingActionsType } from './types';

export const postHogOnboardingActions: PostHogOnboardingActionsType = {
  landing: {
    ANALYTICS_AGREE_CLICK: PostHogAction.LandingAnalyticsAgreeClick,
    ANALYTICS_REJECT_CLICK: PostHogAction.LandingAnalyticsRejectClick
  },
  create: {
    SETUP_OPTION_CLICK: PostHogAction.OnboardingCreateClick,
    SAVE_RECOVERY_PHRASE_NEXT_CLICK: PostHogAction.OnboardingCreateSaveRecoveryPhraseNextClick,
    ENTER_WALLET: PostHogAction.OnboardingCreateEnterRecoveryPhraseEnterWalletClick,
    WALLET_NAME_PASSWORD_NEXT_CLICK: PostHogAction.OnboardingCreateWalletNamePasswordNextClick,
    RECOVERY_PHRASE_INTRO_WATCH_VIDEO_CLICK: PostHogAction.OnboardingCreateSaveRecoveryPhraseIntroPlayVideoClick,
    RECOVERY_PHRASE_INTRO_VIDEO_GOTIT_CLICK: PostHogAction.OnboardingCreateKeepWalletSecureGotItClick,
    RECOVERY_PHRASE_COPY_TO_CLIPBOARD_CLICK: PostHogAction.OnboardingCreateSaveRecoveryPhraseCopyToClipboardClick,
    RECOVERY_PHRASE_PASTE_FROM_CLIPBOARD_CLICK: PostHogAction.OnboardingCreateEnterRecoveryPhrasePasteFromClipboardClick
  },
  restore: {
    SETUP_OPTION_CLICK: PostHogAction.OnboardingRestoreClick,
    WALLET_NAME_NEXT_CLICK: PostHogAction.OnboardingRestoreWalletNameNextClick,
    WALLET_PASSWORD_NEXT_CLICK: PostHogAction.OnboardingRestoreWalletPasswordNextClick,
    RECOVERY_PASSPHRASE_LENGTH_NEXT_CLICK: PostHogAction.OnboardingRestoreRecoveryPhraseLengthNextClick,
    RESTORE_MULTI_ADDR_CANCEL_CLICK: PostHogAction.OnboardingRestoreWarningMultiAddressWalletCancelClick,
    RESTORE_MULTI_ADDR_OK_CLICK: PostHogAction.OnboardingRestoreWarningMultiAddressWalletOkClick,
    ENTER_PASSPHRASE_01_NEXT_CLICK: PostHogAction.OnboardingRestoreEnterPassphrase01NextClick,
    ENTER_PASSPHRASE_09_NEXT_CLICK: PostHogAction.OnboardingRestoreEnterPassphrase09NextClick,
    ENTER_PASSPHRASE_17_NEXT_CLICK: PostHogAction.OnboardingRestoreEnterPassphrase17NextClick,
    DONE_GO_TO_WALLET: PostHogAction.OnboardingRestoreDoneGoToWallet,
    WALLET_NAME_PASSWORD_NEXT_CLICK: PostHogAction.OnboardingRestoreWalletNamePasswordNextClick
  },
  hw: {
    WALLET_NAME_NEXT_CLICK: PostHogAction.OnboardingHWNameNextClick,
    CONNECT_HW_NEXT_CLICK: PostHogAction.OnboardingHWConnectNextClick,
    SETUP_HW_WALLET_NEXT_CLICK: PostHogAction.OnboardingHWSelectAccountNextClick,
    SETUP_OPTION_CLICK: PostHogAction.OnboardingHWClick,
    DONE_GO_TO_WALLET: PostHogAction.OnboardingHWDoneGoToWallet
  },
  // eslint-disable-next-line camelcase
  forgot_password: {
    WALLET_PASSWORD_NEXT_CLICK: PostHogAction.UnlockWalletForgotPasswordNextClick,
    RECOVERY_PASSPHRASE_LENGTH_NEXT_CLICK: PostHogAction.UnlockWalletForgotPasswordRecoveryPhraseLengthNextClick,
    ENTER_PASSPHRASE_01_NEXT_CLICK: PostHogAction.UnlockWalletForgotPasswordEnterPassphrase01NextClick,
    ENTER_PASSPHRASE_09_NEXT_CLICK: PostHogAction.UnlockWalletForgotPasswordEnterPassphrase09NextClick,
    ENTER_PASSPHRASE_17_NEXT_CLICK: PostHogAction.UnlockWalletForgotPasswordEnterPassphrase17NextClick
  }
};
