import { walletsActions } from '@lace-contract/wallet-repo';
import { createSlice } from '@reduxjs/toolkit';

import type { MidnightSDKNetworkId } from '../const';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { PayloadAction } from '@reduxjs/toolkit';

type FeeRecoveryRequest = {
  accountId: AccountId;
  requestId: string;
  networkId: MidnightSDKNetworkId;
  indexerAddress: string;
};
type FeeRecoveryJob = FeeRecoveryRequest & {
  status: 'cancelled' | 'complete' | 'failed' | 'running';
  checked: number;
  recovered: number;
};

export const feeRecoveryInitialState = {
  supported: false,
  feesByAccount: {} as Record<string, Record<string, string>>,
  jobs: {} as Record<string, FeeRecoveryJob>,
};

export const feeRecoverySlice = createSlice({
  name: 'midnightFeeRecovery',
  initialState: feeRecoveryInitialState,
  reducers: {
    requestMissingFees: (
      state,
      { payload }: PayloadAction<FeeRecoveryRequest>,
    ) => {
      if (
        !state.supported ||
        state.jobs[payload.accountId]?.status === 'running'
      )
        return;
      state.jobs[payload.accountId] = {
        ...payload,
        status: 'running',
        checked: 0,
        recovered: 0,
      };
    },
    cancelFeeRecovery: (
      state,
      {
        payload,
      }: PayloadAction<Pick<FeeRecoveryRequest, 'accountId' | 'requestId'>>,
    ) => {
      const job = state.jobs[payload.accountId];
      if (job?.requestId === payload.requestId && job.status === 'running')
        job.status = 'cancelled';
    },
    feeRecoveryChecked: (
      state,
      {
        payload,
      }: PayloadAction<
        Pick<FeeRecoveryRequest, 'accountId' | 'requestId'> & {
          hash: string;
          fee?: string;
        }
      >,
    ) => {
      const job = state.jobs[payload.accountId];
      if (job?.requestId !== payload.requestId || job.status !== 'running')
        return;
      job.checked++;
      if (payload.fee !== undefined) {
        const fees = (state.feesByAccount[payload.accountId] ??= {});
        if (fees[payload.hash] === undefined) {
          fees[payload.hash] = payload.fee;
          job.recovered++;
        }
      }
    },
    finishFeeRecovery: (
      state,
      {
        payload,
      }: PayloadAction<
        Pick<FeeRecoveryRequest, 'accountId' | 'requestId'> & {
          status: Exclude<FeeRecoveryJob['status'], 'running'>;
        }
      >,
    ) => {
      const job = state.jobs[payload.accountId];
      if (job?.requestId === payload.requestId && job.status === 'running')
        job.status = payload.status;
    },
    clearRecoveredFees: (
      state,
      { payload }: PayloadAction<{ accountId: AccountId }>,
    ) => {
      delete state.jobs[payload.accountId];
      delete state.feesByAccount[payload.accountId];
    },
  },
  extraReducers: builder => {
    builder
      .addCase(walletsActions.wallets.removeAccount, (state, { payload }) => {
        delete state.jobs[payload.accountId];
        delete state.feesByAccount[payload.accountId];
      })
      .addCase(walletsActions.wallets.removeWallet, (state, { payload }) => {
        // Use action IDs: the repository has already removed the wallet when
        // side effects see this action.
        for (const accountId of payload.accountIds) {
          delete state.jobs[accountId];
          delete state.feesByAccount[accountId];
        }
      })
      .addCase(walletsActions.wallets.removeAllWallets, state => {
        state.jobs = {};
        state.feesByAccount = {};
      });
  },
  selectors: {
    selectRecoveredFees: state => state.feesByAccount,
    selectFeeRecoveryJobs: state => state.jobs,
    selectSupportsFeeRecovery: state => state.supported,
  },
});
