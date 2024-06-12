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
  | 'WALLET_ADDED',
  string
>;
export type RestoreFlowActions = Record<
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
    hardware: HardwareFlowActions;
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
