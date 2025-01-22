export type CreateFlowActions = Record<
  | 'SETUP_OPTION_CLICK'
  | 'SAVE_RECOVERY_PHRASE_NEXT_CLICK'
  | 'ENTER_RECOVERY_PHRASE_NEXT_CLICK'
  | 'ENTER_WALLET'
  | 'RECOVERY_PHRASE_INTRO_WATCH_VIDEO_CLICK'
  | 'RECOVERY_PHRASE_INTRO_VIDEO_GOTIT_CLICK'
  | 'RECOVERY_PHRASE_COPY_TO_CLIPBOARD_CLICK'
  | 'RECOVERY_PHRASE_PASTE_FROM_CLIPBOARD_CLICK'
  | 'RECOVERY_PHRASE_COPY_READ_MORE_CLICK'
  | 'RECOVERY_PHRASE_PASTE_READ_MORE_CLICK'
  | 'WALLET_ADDED'
  | 'CHOOSE_RECOVERY_MODE_MNEMONIC_CLICK'
  | 'CHOOSE_RECOVERY_MODE_PAPER_CLICK'
  | 'CHOOSE_RECOVERY_MODE_NEXT_CLICK'
  | 'PGP_PUBLIC_KEY_PAGE_VIEW'
  | 'PGP_PUBLIC_KEY_NEXT_CLICK'
  | 'WALLET_SETUP_GENERATE_PAPER_WALLET_CLICK'
  | 'PAPER_WALLET_DOWNLOAD_PAGEVIEW'
  | 'DOWNLOAD_PAPER_WALLET_CLICK'
  | 'PRINT_PAPER_WALLET_CLICK'
  | 'PAPER_WALLET_COMPLETE_CLICK',
  string
>;
export type RestoreFlowActions = Record<
  | 'WALLET_SETUP_PAGEVIEW'
  | 'CHOOSE_RECOVERY_MODE_MNEMONIC_CLICK'
  | 'CHOOSE_RECOVERY_MODE_PAPER_CLICK'
  | 'CHOOSE_RECOVERY_MODE_NEXT_CLICK'
  | 'SCAN_QR_CODE_PAGEVIEW'
  | 'SCAN_QR_CODE_CAMERA_OK'
  | 'SCAN_QR_CODE_CAMERA_ERROR'
  | 'SCAN_QR_CODE_READ_SUCCESS'
  | 'SCAN_QR_CODE_READ_ERROR'
  | 'WALLET_OVERVIEW_NEXT_CLICK'
  | 'ENTER_PGP_PRIVATE_KEY_PAGE_VIEW'
  | 'ENTER_PGP_PRIVATE_KEY_NEXT_CLICK'
  | 'SETUP_OPTION_CLICK'
  | 'ENTER_RECOVERY_PHRASE_NEXT_CLICK'
  | 'ENTER_WALLET'
  | 'RECOVERY_PHRASE_PASTE_FROM_CLIPBOARD_CLICK'
  | 'RECOVERY_PHRASE_PASTE_READ_MORE_CLICK'
  | 'WALLET_ADDED'
  | 'HD_WALLET',
  string
>;
export type HardwareFlowActions = Record<
  | 'SETUP_OPTION_CLICK'
  | 'CONNECT_HW_VIEW'
  | 'HW_POPUP_CONNECT_CLICK'
  | 'CONNECT_HW_TRY_AGAIN_CLICK'
  | 'SETUP_HW_ACCOUNT_NO_CLICK'
  | 'ENTER_WALLET'
  | 'WALLET_ADDED'
  | 'HD_WALLET',
  string
>;

export type ValidateOnboardingActionsStructure<
  T extends {
    create: CreateFlowActions;
    restore: RestoreFlowActions;
    hw: HardwareFlowActions;
    // eslint-disable-next-line camelcase
    forgot_password: Record<
      'ENTER_RECOVERY_PHRASE_NEXT_CLICK' | 'ENTER_WALLET' | 'RECOVERY_PHRASE_PASTE_FROM_CLIPBOARD_CLICK',
      string
    >;
    onboarding: Record<
      'ANALYTICS_AGREE_CLICK' | 'ANALYTICS_REJECT_CLICK' | 'LEARN_MORE_CLICK' | 'GOT_IT_CLICK' | 'PIN_EXTENSION_CLICK',
      string
    >;
  }
> = T;

export type ValidateMultiWalletActionsStructure<
  T extends {
    create: CreateFlowActions;
    restore: RestoreFlowActions;
    hardware: HardwareFlowActions;
  }
> = T;

type ActionsObject = Record<string, Record<string, unknown>>;
type Values<T> = T[keyof T];
type ActionsMap<T extends ActionsObject> = {
  [Prop in keyof T]: T[Prop][keyof T[Prop]];
};
export type ExtractActionsAsUnion<A extends ActionsObject> = Values<ActionsMap<A>>;
