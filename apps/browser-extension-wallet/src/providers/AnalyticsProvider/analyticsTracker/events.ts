import { PostHogAction, PostHogOnboardingActionsType } from './types';

export const postHogOnboardingActions: PostHogOnboardingActionsType = {
  create: {
    ANALYTICS_AGREE_CLICK: PostHogAction.OnboardingCreateAnalyticsAgreeClick,
    ANALYTICS_SKIP_CLICK: PostHogAction.OnboardingCreateAnalyticsSkipClick,
    SETUP_OPTION_CLICK: PostHogAction.OnboardingCreateClick,
    LACE_TERMS_OF_USE_NEXT_CLICK: PostHogAction.OnboardingCreateLaceTermsOfUseNextClick,
    WALLET_NAME_NEXT_CLICK: PostHogAction.OnboardingCreateWalletNameNextClick,
    WALLET_PASSWORD_NEXT_CLICK: PostHogAction.OnboardingCreateWalletPasswordNextClick,
    PASSPHRASE_INTRO_NEXT_CLICK: PostHogAction.OnboardingCreatePassphraseIntroNextClick,
    WRITE_PASSPHRASE_01_NEXT_CLICK: PostHogAction.OnboardingCreateWritePassphrase01NextClick,
    WRITE_PASSPHRASE_09_NEXT_CLICK: PostHogAction.OnboardingCreateWritePassphrase09NextClick,
    WRITE_PASSPHRASE_17_NEXT_CLICK: PostHogAction.OnboardingCreateWritePassphrase17NextClick,
    ENTER_PASSPHRASE_01_NEXT_CLICK: PostHogAction.OnboardingCreateEnterPassphrase01NextClick,
    ENTER_PASSPHRASE_09_NEXT_CLICK: PostHogAction.OnboardingCreateEnterPassphrase09NextClick,
    ENTER_PASSPHRASE_17_NEXT_CLICK: PostHogAction.OnboardingCreateEnterPassphrase17NextClick,
    DONE_GO_TO_WALLET: PostHogAction.OnboardingCreateDoneGoToWallet,
    WALLET_NAME_PASSWORD_NEXT_CLICK: PostHogAction.OnboardingCreateWalletNamePasswordNextClick,
    PASSPHRASE_INTRO_PLAY_VIDEO_CLICK: PostHogAction.OnboardingCreatePassphraseIntroPlayVideoClick
  },
  restore: {
    ANALYTICS_AGREE_CLICK: PostHogAction.OnboardingRestoreAnalyticsAgreeClick,
    ANALYTICS_SKIP_CLICK: PostHogAction.OnboardingRestoreAnalyticsSkipClick,
    SETUP_OPTION_CLICK: PostHogAction.OnboardingRestoreClick,
    LACE_TERMS_OF_USE_NEXT_CLICK: PostHogAction.OnboardingRestoreLaceTermsOfUseNextClick,
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
    ANALYTICS_AGREE_CLICK: PostHogAction.OnboardingHWAnalyticsAgreeClick,
    ANALYTICS_SKIP_CLICK: PostHogAction.OnboardingHWAnalyticsSkipClick,
    WALLET_NAME_NEXT_CLICK: PostHogAction.OnboardingHWNameNextClick,
    LACE_TERMS_OF_USE_NEXT_CLICK: PostHogAction.OnboardinHWLaceTermsOfUseNextClick,
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
