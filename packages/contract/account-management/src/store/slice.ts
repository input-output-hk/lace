import { createSlice } from '@reduxjs/toolkit';
import { createAction } from '@reduxjs/toolkit';

import type { TranslationKey } from '@lace-contract/i18n';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { WalletId, AccountId } from '@lace-contract/wallet-repo';
import type {
  AttemptCreateHardwareWalletPayload,
  HardwareErrorCategory,
} from '@lace-lib/util-hw';
import type { BlockchainName } from '@lace-lib/util-store';
import type {
  PayloadAction,
  StateFromReducersMapObject,
} from '@reduxjs/toolkit';
import type * as _immer from 'immer';

export type LastAddedAccount = {
  walletId: WalletId;
  blockchain: BlockchainName;
  accountIndex: number;
  shouldSuppressAccountStatus?: boolean;
};

export type RestoreWalletFlowState = {
  passphrase: string;
  recoveryPhrase: string[];
  selectedBlockchains: BlockchainName[];
};

export type AccountManagementSliceState = {
  isLoading: boolean;
  lastAddedAccount: LastAddedAccount | null;
  lastFailedWallet: WalletId | null;
  // TranslationKey union (~1600 members) in slice state causes TS7056
  // (inferred module type exceeds serialization limit) at module types inferrence.
  // Store as string, cast to TranslationKey at usage site.
  lastFailedErrorTitle: string | null;
  lastFailedErrorDescription: string | null;
  lastHardwareWalletCreationError: HardwareErrorCategory | null;
  restoreWalletFlow: RestoreWalletFlowState | null;
};

const initialState: AccountManagementSliceState = {
  isLoading: false,
  lastAddedAccount: null,
  lastFailedWallet: null,
  lastFailedErrorTitle: null,
  lastFailedErrorDescription: null,
  lastHardwareWalletCreationError: null,
  restoreWalletFlow: null,
};

const slice = createSlice({
  name: 'accountManagement',
  initialState,
  reducers: {
    setLoading: (state, { payload }: PayloadAction<boolean>) => {
      state.isLoading = payload;
    },
    accountAdded: (state, { payload }: PayloadAction<LastAddedAccount>) => {
      state.lastAddedAccount = payload.shouldSuppressAccountStatus
        ? null
        : payload;
      state.lastFailedWallet = null;
      state.lastFailedErrorTitle = null;
      state.lastFailedErrorDescription = null;
      state.isLoading = false;
    },
    attemptAddAccountFailed: (
      state,
      {
        payload,
      }: PayloadAction<{
        walletId: WalletId;
        errorTitle?: string;
        errorDescription?: string;
      }>,
    ) => {
      state.lastFailedWallet = payload.walletId;
      state.lastFailedErrorTitle = payload.errorTitle ?? null;
      state.lastFailedErrorDescription = payload.errorDescription ?? null;
      state.lastAddedAccount = null;
      state.isLoading = false;
    },
    clearAccountStatus: state => {
      state.lastAddedAccount = null;
      state.lastFailedWallet = null;
      state.lastFailedErrorTitle = null;
      state.lastFailedErrorDescription = null;
      state.lastHardwareWalletCreationError = null;
    },
    hardwareWalletCreationFailed: (
      state,
      { payload }: PayloadAction<{ reason: HardwareErrorCategory }>,
    ) => {
      state.lastHardwareWalletCreationError = payload.reason;
      state.isLoading = false;
    },
    setRestoreWalletRecoveryPhrase: (
      state,
      {
        payload,
      }: PayloadAction<{ passphrase: string; recoveryPhrase: string[] }>,
    ) => {
      state.restoreWalletFlow = {
        passphrase: payload.passphrase,
        recoveryPhrase: payload.recoveryPhrase,
        selectedBlockchains: state.restoreWalletFlow?.selectedBlockchains ?? [],
      };
    },
    setRestoreWalletSelectedBlockchains: (
      state,
      { payload }: PayloadAction<BlockchainName[]>,
    ) => {
      if (!state.restoreWalletFlow) {
        state.restoreWalletFlow = {
          passphrase: '',
          recoveryPhrase: [],
          selectedBlockchains: payload,
        };
        return;
      }
      state.restoreWalletFlow.selectedBlockchains = payload;
    },
    clearRestoreWalletFlow: state => {
      state.restoreWalletFlow = null;
    },
  },
  selectors: {
    getIsLoading: (state: Readonly<AccountManagementSliceState>) =>
      state.isLoading,
    getLastAddedAccount: (state: Readonly<AccountManagementSliceState>) =>
      state.lastAddedAccount,
    getLastFailedWallet: (state: Readonly<AccountManagementSliceState>) =>
      state.lastFailedWallet,
    getLastFailedErrorTitle: (state: Readonly<AccountManagementSliceState>) =>
      state.lastFailedErrorTitle,
    getLastFailedErrorDescription: (
      state: Readonly<AccountManagementSliceState>,
    ) => state.lastFailedErrorDescription,
    getRestoreWalletFlow: (state: Readonly<AccountManagementSliceState>) =>
      state.restoreWalletFlow,
    getLastHardwareWalletCreationError: (
      state: Readonly<AccountManagementSliceState>,
    ) => state.lastHardwareWalletCreationError,
  },
});

export const accountManagementReducers = {
  [slice.name]: slice.reducer,
};

export type AddedAccountProps = {
  accountIndex: number;
  walletId: WalletId;
  accountName: string;
  blockchain: BlockchainName;
  targetNetworks: Set<BlockchainNetworkId>;
};

// Generic props for adding account to any wallet type
// authenticationPromptConfig is optional: HW wallets authenticate via device.
export type AddAccountProps = AddedAccountProps & {
  authenticationPromptConfig?: {
    cancellable?: boolean;
    confirmButtonLabel: TranslationKey;
    message: TranslationKey;
  };
  shouldSuppressAccountStatus?: boolean;
};

export type AddInMemoryWalletAccountProps = AddedAccountProps & {
  authenticationPromptConfig: {
    cancellable?: boolean;
    confirmButtonLabel: TranslationKey;
    message: TranslationKey;
  };
  shouldSuppressAccountStatus?: boolean;
};

export type CreateWalletProps = {
  walletName: string;
  blockchains: BlockchainName[];
  recoveryPhrase?: string[];
};

export type RemoveWalletProps = {
  walletId: WalletId;
  authenticationPromptConfig: {
    cancellable?: boolean;
    confirmButtonLabel: TranslationKey;
    message: TranslationKey;
  };
};

export type RemoveAccountProps = {
  walletId: WalletId;
  accountId: AccountId;
  authenticationPromptConfig: {
    cancellable?: boolean;
    confirmButtonLabel: TranslationKey;
    message: TranslationKey;
  };
};

const attemptAddInMemoryWalletAccount = createAction(
  'accountManagement/attemptAddInMemoryWalletAccount',
  (payload: AddInMemoryWalletAccountProps) => ({
    payload,
  }),
);

const attemptAddAccount = createAction(
  'accountManagement/attemptAddAccount',
  (payload: AddAccountProps) => ({
    payload,
  }),
);

const attemptRemoveWallet = createAction(
  'accountManagement/attemptRemoveWallet',
  (payload: RemoveWalletProps) => ({
    payload,
  }),
);

const attemptRemoveAccount = createAction(
  'accountManagement/attemptRemoveAccount',
  (payload: RemoveAccountProps) => ({
    payload,
  }),
);

const attemptCreateWallet = createAction(
  'accountManagement/attemptCreateWallet',
  (payload: CreateWalletProps) => ({
    payload,
  }),
);

const attemptCreateHardwareWallet = createAction(
  'accountManagement/attemptCreateHardwareWallet',
  (payload: AttemptCreateHardwareWalletPayload) => ({
    payload,
  }),
);

export const accountManagementActions = {
  accountManagement: {
    ...slice.actions,
    attemptAddInMemoryWalletAccount,
    attemptAddAccount,
    attemptRemoveWallet,
    attemptRemoveAccount,
    attemptCreateWallet,
    attemptCreateHardwareWallet,
  },
};

export const accountManagementSelectors = {
  accountManagement: slice.selectors,
};

export type AccountManagementStoreState = StateFromReducersMapObject<
  typeof accountManagementReducers
>;
