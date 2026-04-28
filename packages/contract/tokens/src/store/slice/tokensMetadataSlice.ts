import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { StoredTokenMetadata } from '../../types';
import type { TokenId } from '../../value-objects';

export type MetadataByTokenId = Partial<Record<TokenId, StoredTokenMetadata>>;

export type TokensMetadataState = {
  byTokenId: MetadataByTokenId;
};

const initialTokensMetadataState: TokensMetadataState = {
  byTokenId: {},
};

export type UpsertTokensMetadataPayload = {
  metadatas: StoredTokenMetadata[];
  balances?: Record<TokenId, string>;
};

const setAll = (
  state: TokensMetadataState,
  tokensMetadata: StoredTokenMetadata[],
) => {
  for (const metadata of tokensMetadata) {
    state.byTokenId[metadata.tokenId] = metadata;
  }
};

const storedTokensMetadataSlice = createSlice({
  name: 'tokensMetadata',
  initialState: initialTokensMetadataState,
  reducers: {
    upsertTokensMetadata: (
      state,
      { payload }: Readonly<PayloadAction<UpsertTokensMetadataPayload>>,
    ) => {
      const { metadatas, balances } = payload;
      if (!balances) {
        setAll(state, metadatas);
        return;
      }

      setAll(
        state,
        metadatas.filter(
          t => balances?.[t.tokenId] && balances[t.tokenId] !== '0',
        ),
      );
    },
    upsertTokenMetadata: (
      state,
      { payload }: Readonly<PayloadAction<StoredTokenMetadata>>,
    ) => {
      setAll(state, [payload]);
    },
  },
  selectors: {
    selectTokensMetadata: ({ byTokenId }): MetadataByTokenId => byTokenId,
  },
});

const tokensMetadataSelectors = storedTokensMetadataSlice.selectors;

const tokensMetadataActions = {
  ...storedTokensMetadataSlice.actions,
};

const tokensMetadataReducers = {
  tokensMetadata: storedTokensMetadataSlice.reducer,
};

export {
  tokensMetadataSelectors,
  tokensMetadataActions,
  tokensMetadataReducers,
};
