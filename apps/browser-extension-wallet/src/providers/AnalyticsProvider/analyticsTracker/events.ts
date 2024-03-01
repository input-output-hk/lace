import { PostHogAction, PostHogOnboardingActionsType } from './types';

export const postHogOnboardingActions: PostHogOnboardingActionsType = {
  landing: {
    ANALYTICS_AGREE_CLICK: PostHogAction.LandingAnalyticsAgreeClick,
    ANALYTICS_REJECT_CLICK: PostHogAction.LandingAnalyticsRejectClick
  },
  create: {
    SETUP_OPTION_CLICK: PostHogAction.OnboardingCreateClick,
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
