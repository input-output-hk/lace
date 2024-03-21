import { PostHogAction, PostHogOnboardingActionsType } from './types';

export const postHogOnboardingActions: PostHogOnboardingActionsType = {
  onboarding: {
    ANALYTICS_AGREE_CLICK: PostHogAction.OnboardingAnalyticsAgreeClick,
    ANALYTICS_REJECT_CLICK: PostHogAction.OnboardingAnalyticsRejectClick,
    LEARN_MORE_CLICK: PostHogAction.OnboardingAnalyticsLearnMoreClick,
    GOT_IT_CLICK: PostHogAction.OnboardingAnalyticsGotItClick,
    PIN_EXTENSION_CLICK: PostHogAction.OnboardingMainViewPinExtensionClick
  },
  create: {
    SETUP_OPTION_CLICK: PostHogAction.OnboardingCreateClick,
    SAVE_RECOVERY_PHRASE_NEXT_CLICK: PostHogAction.OnboardingCreateSaveRecoveryPhraseNextClick,
    ENTER_WALLET: PostHogAction.OnboardingCreateEnterWalletClick,
    WALLET_NAME_PASSWORD_NEXT_CLICK: PostHogAction.OnboardingCreateWalletNamePasswordNextClick,
    RECOVERY_PHRASE_INTRO_WATCH_VIDEO_CLICK: PostHogAction.OnboardingCreateSaveRecoveryPhraseIntroPlayVideoClick,
    RECOVERY_PHRASE_INTRO_VIDEO_GOTIT_CLICK: PostHogAction.OnboardingCreateKeepWalletSecureGotItClick,
    RECOVERY_PHRASE_COPY_TO_CLIPBOARD_CLICK: PostHogAction.OnboardingCreateSaveRecoveryPhraseCopyToClipboardClick,
    RECOVERY_PHRASE_PASTE_FROM_CLIPBOARD_CLICK: PostHogAction.OnboardingCreateEnterRecoveryPhrasePasteFromClipboardClick
  },
  restore: {
    SETUP_OPTION_CLICK: PostHogAction.OnboardingRestoreClick,
    ENTER_WALLET: PostHogAction.OnboardingRestoreEnterWalletClick,
    WALLET_NAME_PASSWORD_NEXT_CLICK: PostHogAction.OnboardingRestoreWalletNamePasswordNextClick,
    RECOVERY_PHRASE_PASTE_FROM_CLIPBOARD_CLICK:
      PostHogAction.OnboardingRestoreEnterRecoveryPhrasePasteFromClipboardClick
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
    RECOVERY_PASSPHRASE_VERIFICATION_NEXT_CLICK: PostHogAction.UnlockWalletForgotPasswordRecoveryPhraseNextClick,
    NAME_PASSWORD_ENTER_WALLET_CLICK: PostHogAction.UnlockWalletForgotPasswordEnterWalletClick,
    PASTE_FROM_CLIPBOARD_CLICK: PostHogAction.UnlockWalletForgotPasswordRecoveryPhrasePasteFromClipboardClick
  }
};
