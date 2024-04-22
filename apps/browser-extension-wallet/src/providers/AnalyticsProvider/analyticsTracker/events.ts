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
    ENTER_RECOVERY_PHRASE_NEXT_CLICK: PostHogAction.OnboardingCreateEnterRecoveryPhraseNextClick,
    ENTER_WALLET: PostHogAction.OnboardingCreateEnterWalletClick,
    RECOVERY_PHRASE_INTRO_WATCH_VIDEO_CLICK: PostHogAction.OnboardingCreateSaveRecoveryPhraseIntroPlayVideoClick,
    RECOVERY_PHRASE_INTRO_VIDEO_GOTIT_CLICK: PostHogAction.OnboardingCreateKeepWalletSecureGotItClick,
    RECOVERY_PHRASE_COPY_TO_CLIPBOARD_CLICK: PostHogAction.OnboardingCreateSaveRecoveryPhraseCopyToClipboardClick,
    RECOVERY_PHRASE_PASTE_FROM_CLIPBOARD_CLICK: PostHogAction.OnboardingCreateEnterRecoveryPhrasePasteFromClipboardClick
  },
  restore: {
    SETUP_OPTION_CLICK: PostHogAction.OnboardingRestoreClick,
    ENTER_WALLET: PostHogAction.OnboardingRestoreEnterWalletClick,
    ENTER_RECOVERY_PHRASE_NEXT_CLICK: PostHogAction.OnboardingRestoreEnterRecoveryPhraseNextClick,
    RECOVERY_PHRASE_PASTE_FROM_CLIPBOARD_CLICK:
      PostHogAction.OnboardingRestoreEnterRecoveryPhrasePasteFromClipboardClick
  },
  hw: {
    SETUP_OPTION_CLICK: PostHogAction.OnboardingHWClick,
    CONNECT_HW_VIEW: PostHogAction.OnboardingHWConnectView,
    HW_POPUP_CONNECT_CLICK: PostHogAction.OnboardingHWPopupConnectClick,
    CONNECT_HW_TRY_AGAIN_CLICK: PostHogAction.OnboardingHWConnectTryAgainClick,
    SETUP_HW_ACCOUNT_NO_CLICK: PostHogAction.OnboardingHWSetupWalletAccountNoClick,
    ENTER_WALLET: PostHogAction.OnboardingHWEnterWalletClick
  },
  // eslint-disable-next-line camelcase
  forgot_password: {
    ENTER_RECOVERY_PHRASE_NEXT_CLICK: PostHogAction.UnlockWalletForgotPasswordRecoveryPhraseNextClick,
    ENTER_WALLET: PostHogAction.UnlockWalletForgotPasswordEnterWalletClick,
    RECOVERY_PHRASE_PASTE_FROM_CLIPBOARD_CLICK:
      PostHogAction.UnlockWalletForgotPasswordRecoveryPhrasePasteFromClipboardClick
  }
};
