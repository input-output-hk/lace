import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { StoredTokenMetadata } from '../../types';
import type { TokenId } from '../../value-objects';

export type PortfolioPolicyState = {
  /** Curated metadata applied as a fallback when on-chain metadata is missing. */
  curatedMetadataByTokenId: Partial<Record<TokenId, StoredTokenMetadata>>;
};

const initialPortfolioPolicyState: PortfolioPolicyState = {
  curatedMetadataByTokenId: {},
};

export type RegisterCuratedMetadataPayload = {
  metadatas: StoredTokenMetadata[];
};

const portfolioPolicySlice = createSlice({
  name: 'portfolioPolicy',
  initialState: initialPortfolioPolicyState,
  reducers: {
    registerCuratedMetadata: (
      state,
      { payload }: Readonly<PayloadAction<RegisterCuratedMetadataPayload>>,
    ) => {
      for (const metadata of payload.metadatas) {
        state.curatedMetadataByTokenId[metadata.tokenId] = metadata;
      }
    },
  },
  selectors: {
    selectCuratedMetadataByTokenId: ({
      curatedMetadataByTokenId,
    }): Partial<Record<TokenId, StoredTokenMetadata>> =>
      curatedMetadataByTokenId,
  },
});

export const portfolioPolicySelectors = portfolioPolicySlice.selectors;

export const portfolioPolicyActions = {
  ...portfolioPolicySlice.actions,
};

export const portfolioPolicyReducers = {
  portfolioPolicy: portfolioPolicySlice.reducer,
};
