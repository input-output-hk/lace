import { createSlice } from '@reduxjs/toolkit';

import type { AttemptCreateHardwareWalletPayload } from '../types';
import type { WalletId } from '@lace-contract/wallet-repo';
import type { HardwareErrorCategory } from '@lace-lib/util-hw';
import type { BlockchainName } from '@lace-lib/util-store';
import type {
  PayloadAction,
  StateFromReducersMapObject,
} from '@reduxjs/toolkit';

export type PendingCreateWallet = {
  password?: string;
  recoveryPhrase?: string[];
};

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
};

export type OnboardingV2SliceState = {
  isCreatingWallet: boolean;
  createWalletError: CreateWalletErrorReason | null;
  lastCreatedWalletId: WalletId | null;
  pendingCreateWallet: PendingCreateWallet | null;
};

const initialState: OnboardingV2SliceState = {
  isCreatingWallet: false,
  createWalletError: null,
  lastCreatedWalletId: null,
  pendingCreateWallet: null,
};

const slice = createSlice({
  name: 'onboardingV2',
  initialState,
  reducers: {
    setPendingCreateWallet: (
      state,
      { payload }: Readonly<PayloadAction<Partial<PendingCreateWallet>>>,
    ) => {
      const merged = {
        ...state.pendingCreateWallet,
        ...payload,
      };

      const nextPending = Object.fromEntries(
        Object.entries(merged).filter(([, value]) => value !== undefined),
      ) as PendingCreateWallet;

      state.pendingCreateWallet =
        Object.keys(nextPending).length > 0 ? nextPending : null;
      state.createWalletError = null;
      state.lastCreatedWalletId = null;
    },
    clearPendingCreateWallet: state => {
      state.pendingCreateWallet = null;
    },
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
      _action: Readonly<PayloadAction<AttemptCreateHardwareWalletPayload>>,
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
      state.pendingCreateWallet = null;
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
    selectPendingCreateWallet: ({ pendingCreateWallet }) => pendingCreateWallet,
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
