import { createSlice } from '@reduxjs/toolkit';

import type {
  ClaimNftWithMetadata,
  ClaimPayload,
  ClaimResponseError,
  ClaimResponseSuccess,
  ClaimTokenWithCdnMetadata,
} from '../types';
import type { AnyAddress } from '@lace-contract/addresses';
import type { AnyAccount } from '@lace-contract/wallet-repo';
import type { PayloadAction } from '@reduxjs/toolkit';

export type CardanoUriLinkingState = {
  error: ClaimResponseError | null;
  claimResponse: ClaimResponseSuccess | null;
  claimingAccount: AnyAccount | null;
  claimingAddress: AnyAddress | null;
  isSubmitting: boolean;
  tokenMetadata: ClaimTokenWithCdnMetadata[] | null;
  isLoadingTokenMetadata: boolean;
  nftMetadata: ClaimNftWithMetadata[] | null;
  isLoadingNftMetadata: boolean;
};

const initialState: CardanoUriLinkingState = {
  error: null,
  claimResponse: null,
  claimingAccount: null,
  claimingAddress: null,
  isSubmitting: false,
  tokenMetadata: null,
  isLoadingTokenMetadata: false,
  nftMetadata: null,
  isLoadingNftMetadata: false,
};

const slice = createSlice({
  name: 'cardanoUriLinking',
  initialState,
  reducers: {
    setError: (
      state,
      { payload }: Readonly<PayloadAction<ClaimResponseError | null>>,
    ) => {
      state.error = payload;
    },
    setClaimResponse: (
      state,
      { payload }: Readonly<PayloadAction<ClaimResponseSuccess | null>>,
    ) => {
      state.claimResponse = payload;
    },
    setClaimingAccount: (
      state,
      { payload }: Readonly<PayloadAction<AnyAccount | null>>,
    ) => {
      state.claimingAccount = payload;
    },
    setClaimingAddress: (
      state,
      { payload }: Readonly<PayloadAction<AnyAddress | null>>,
    ) => {
      state.claimingAddress = payload;
    },
    // Claim submission actions
    submitClaim: (state, _action: Readonly<PayloadAction<ClaimPayload>>) => {
      state.isSubmitting = true;
      state.error = null;
      state.claimResponse = null;
      state.tokenMetadata = null;
      state.nftMetadata = null;
      state.isLoadingTokenMetadata = false;
      state.isLoadingNftMetadata = false;
    },
    submitClaimSuccess: (
      state,
      { payload }: Readonly<PayloadAction<ClaimResponseSuccess>>,
    ) => {
      state.isSubmitting = false;
      state.claimResponse = payload;
      state.error = null;
    },
    submitClaimFailed: (
      state,
      { payload }: Readonly<PayloadAction<ClaimResponseError>>,
    ) => {
      state.isSubmitting = false;
      state.error = payload;
    },
    // Token metadata actions
    loadTokenMetadata: state => {
      state.isLoadingTokenMetadata = true;
    },
    tokenMetadataLoaded: (
      state,
      { payload }: Readonly<PayloadAction<ClaimTokenWithCdnMetadata[]>>,
    ) => {
      state.isLoadingTokenMetadata = false;
      state.tokenMetadata = payload;
    },
    tokenMetadataFailed: state => {
      state.isLoadingTokenMetadata = false;
    },
    // NFT metadata actions
    loadNftMetadata: state => {
      state.isLoadingNftMetadata = true;
    },
    nftMetadataLoaded: (
      state,
      { payload }: Readonly<PayloadAction<ClaimNftWithMetadata[]>>,
    ) => {
      state.isLoadingNftMetadata = false;
      state.nftMetadata = payload;
    },
    nftMetadataFailed: state => {
      state.isLoadingNftMetadata = false;
    },
    // Reset state
    reset: () => initialState,
  },
  selectors: {
    selectError: state => state.error,
    selectClaimResponse: state => state.claimResponse,
    selectClaimingAccount: state => state.claimingAccount,
    selectClaimingAddress: state => state.claimingAddress,
    selectIsSubmitting: state => state.isSubmitting,
    selectTokenMetadata: state => state.tokenMetadata,
    selectIsLoadingTokenMetadata: state => state.isLoadingTokenMetadata,
    selectNftMetadata: state => state.nftMetadata,
    selectIsLoadingNftMetadata: state => state.isLoadingNftMetadata,
  },
});

export const cardanoUriLinkingReducers = {
  [slice.name]: slice.reducer,
};

export const cardanoUriLinkingSelectors = {
  [slice.name]: slice.selectors,
};

export const cardanoUriLinkingActions = {
  [slice.name]: slice.actions,
};
