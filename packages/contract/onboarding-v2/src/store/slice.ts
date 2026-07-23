import { createSlice } from '@reduxjs/toolkit';

import type { AttemptCreateHardwareWalletActionPayload } from '../types';
import type { WalletId, WalletType } from '@lace-contract/wallet-repo';
import type { HardwareErrorCategory } from '@lace-lib/util-hw';
import type { BlockchainName } from '@lace-lib/util-store';
import type {
  PayloadAction,
  StateFromReducersMapObject,
} from '@reduxjs/toolkit';

export type CreateWalletPayload = {
  walletName: string;
  blockchains: BlockchainName[];
  password: string;
  recoveryPhrase?: string[];
};

/**
 * All recognised reasons for wallet creation failure.
 * Kept as a union so TypeScript catches unhandled/missing translation keys.
 */
export type CreateWalletErrorReason =
  | HardwareErrorCategory
  | 'biometric-auth-failed'
  | 'creation-failed'
  | 'invalid-input'
  | 'missing-integration';

export type CreateWalletFailurePayload = {
  reason?: CreateWalletErrorReason;
};

export type CreateWalletSuccessPayload = {
  walletId: WalletId;
  isRecovery: boolean;
  walletType: WalletType;
  blockchains: BlockchainName[];
};

export type OnboardingV2SliceState = {
  isCreatingWallet: boolean;
  createWalletError: CreateWalletErrorReason | null;
  lastCreatedWalletId: WalletId | null;
};

const initialState: OnboardingV2SliceState = {
  isCreatingWallet: false,
  createWalletError: null,
  lastCreatedWalletId: null,
};

const slice = createSlice({
  name: 'onboardingV2',
  initialState,
  reducers: {
    attemptCreateWallet: (
      state,
      _action: Readonly<PayloadAction<CreateWalletPayload>>,
    ) => {
      state.isCreatingWallet = true;
      state.createWalletError = null;
      state.lastCreatedWalletId = null;
    },
    attemptCreateHardwareWallet: (
      state,
      _action: Readonly<
        PayloadAction<AttemptCreateHardwareWalletActionPayload>
      >,
    ) => {
      state.isCreatingWallet = true;
      state.createWalletError = null;
      state.lastCreatedWalletId = null;
    },
    createWalletSuccess: (
      state,
      { payload }: Readonly<PayloadAction<CreateWalletSuccessPayload>>,
    ) => {
      state.isCreatingWallet = false;
      state.createWalletError = null;
      state.lastCreatedWalletId = payload.walletId;
    },
    createWalletFailure: (
      state,
      { payload }: Readonly<PayloadAction<CreateWalletFailurePayload>>,
    ) => {
      state.isCreatingWallet = false;
      state.createWalletError = payload.reason ?? null;
      state.lastCreatedWalletId = null;
    },
    resetCreateWalletStatus: state => {
      state.isCreatingWallet = false;
      state.createWalletError = null;
      state.lastCreatedWalletId = null;
    },
  },
  selectors: {
    selectIsCreatingWallet: ({ isCreatingWallet }) => isCreatingWallet,
    selectCreateWalletError: ({ createWalletError }) => createWalletError,
    selectLastCreatedWalletId: ({ lastCreatedWalletId }) => lastCreatedWalletId,
  },
});

export const onboardingV2Reducers = {
  [slice.name]: slice.reducer,
};

export const onboardingV2Actions = {
  onboardingV2: slice.actions,
};

export const onboardingV2Selectors = {
  onboardingV2: slice.selectors,
};

export type OnboardingV2StoreState = StateFromReducersMapObject<
  typeof onboardingV2Reducers
>;
