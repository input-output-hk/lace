import { createSlice } from '@reduxjs/toolkit';

import type { WalletId } from '@lace-contract/wallet-repo';
import type { PayloadAction } from '@reduxjs/toolkit';

export type PasswordMigrationStatus =
  | 'activating'
  | 'completed'
  | 'not-required'
  | 'pending';

export type PasswordMigrationState = {
  status: PasswordMigrationStatus;
  walletsPendingActivation: WalletId[];
  initialWalletCount: number;
};

export type MigrateV1State = {
  isMigrated: true;
  passwordMigration: PasswordMigrationState;
};

const initialState: MigrateV1State = {
  isMigrated: true,
  passwordMigration: {
    status: 'not-required',
    walletsPendingActivation: [],
    initialWalletCount: 0,
  },
};

const removeWalletFromPending = (state: MigrateV1State, walletId: WalletId) => {
  state.passwordMigration.walletsPendingActivation =
    state.passwordMigration.walletsPendingActivation.filter(
      id => id !== walletId,
    );
  if (state.passwordMigration.walletsPendingActivation.length === 0) {
    state.passwordMigration.status = 'completed';
  }
};

const slice = createSlice({
  name: 'migrateV1',
  initialState,
  reducers: {
    passwordMigrationDetected: (state, action: PayloadAction<WalletId[]>) => {
      state.passwordMigration.status = 'pending';
      state.passwordMigration.walletsPendingActivation = action.payload;
      state.passwordMigration.initialWalletCount = action.payload.length;
    },
    applicationPasswordSet: state => {
      if (state.passwordMigration.status === 'pending') {
        state.passwordMigration.status = 'activating';
      }
    },
    walletActivated: (state, action: PayloadAction<WalletId>) => {
      removeWalletFromPending(state, action.payload);
    },
    walletDeleted: (state, action: PayloadAction<WalletId>) => {
      removeWalletFromPending(state, action.payload);
    },
    passwordMigrationCompleted: state => {
      state.passwordMigration.status = 'completed';
      state.passwordMigration.walletsPendingActivation = [];
      state.passwordMigration.initialWalletCount = 0;
    },
    wizardMounted: {
      reducer: () => undefined,
      prepare: () => ({ payload: undefined }),
    },
  },
  selectors: {
    selectPasswordMigrationStatus: (state): PasswordMigrationStatus =>
      state.passwordMigration.status,
    selectWalletsPendingActivation: (state): WalletId[] =>
      state.passwordMigration.walletsPendingActivation,
    selectInitialWalletCount: (state): number =>
      state.passwordMigration.initialWalletCount,
  },
});

export const migrateV1Reducers = {
  [slice.name]: slice.reducer,
};

export const migrateV1Actions = {
  migrateV1: {
    ...slice.actions,
  },
};

export const migrateV1Selectors = {
  migrateV1: slice.selectors,
};
