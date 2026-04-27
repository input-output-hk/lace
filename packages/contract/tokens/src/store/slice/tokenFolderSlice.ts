import { markParameterizedSelector } from '@lace-contract/module';
import { walletsActions } from '@lace-contract/wallet-repo';
import { createSelector, createSlice } from '@reduxjs/toolkit';

import type { FolderId, TokenId } from '../../value-objects';
import type { Folder } from '../types';
import type { PayloadAction } from '@reduxjs/toolkit';

export type TokenIdsByFolderId = Partial<Record<FolderId, TokenId[]>>;

export type TokenFolderState = {
  folders: Folder[];
  tokenIdsByFolderId: TokenIdsByFolderId;
};

type FolderUpdate = Pick<Folder, 'id' | 'name'>;

const initialState: TokenFolderState = {
  folders: [],
  tokenIdsByFolderId: {},
};

const EMPTY_FOLDER_TOKEN_IDS: TokenId[] = [];

const tokenFolderSlice = createSlice({
  name: 'tokenFolders',
  initialState,
  reducers: {
    createFolder: (state, { payload }: PayloadAction<Folder>) => {
      state.folders.unshift(payload);
    },
    updateFolder: (state, { payload }: PayloadAction<FolderUpdate>) => {
      const currentFolder = state.folders.find(
        folder => folder.id === payload.id,
      );
      if (currentFolder) {
        currentFolder.name = payload.name;
      }
    },
    deleteFolder: (state, { payload }: PayloadAction<FolderId>) => {
      state.folders = state.folders.filter(folder => folder.id !== payload);
      delete state.tokenIdsByFolderId[payload];
    },
    addTokensToFolder: (
      state,
      { payload }: PayloadAction<{ tokenIds: TokenId[]; folderId: FolderId }>,
    ) => {
      const existingTokenIds =
        state.tokenIdsByFolderId[payload.folderId] ?? EMPTY_FOLDER_TOKEN_IDS;
      const existingSet = new Set(existingTokenIds);
      const newTokenIds = payload.tokenIds.filter(id => !existingSet.has(id));
      if (newTokenIds.length > 0) {
        state.tokenIdsByFolderId[payload.folderId] = [
          ...existingTokenIds,
          ...newTokenIds,
        ];
      }
    },
    removeTokensFromFolder: (
      state,
      { payload }: PayloadAction<{ tokenIds: TokenId[]; folderId: FolderId }>,
    ) => {
      const existingTokenIds = state.tokenIdsByFolderId[payload.folderId];
      if (!existingTokenIds) return;
      const tokenIdsToRemove = new Set(payload.tokenIds);
      state.tokenIdsByFolderId[payload.folderId] = existingTokenIds.filter(
        id => !tokenIdsToRemove.has(id),
      );
    },
    removeAllTokensFromFolder: (
      state,
      { payload: folderId }: PayloadAction<FolderId>,
    ) => {
      delete state.tokenIdsByFolderId[folderId];
    },
  },
  extraReducers: builder => {
    /**
     * Handles the removeAccount action to remove folders belonging to the account
     * and their associated token assignments.
     * @param state - The current state of the token folder slice.
     * @param action - The removeAccount action containing the payload with accountId.
     */
    builder.addCase(walletsActions.wallets.removeAccount, (state, action) => {
      const { accountId } = action.payload;
      const folderIdsToRemove = state.folders
        .filter(folder => folder.accountId === accountId)
        .map(folder => folder.id);
      state.folders = state.folders.filter(
        folder => folder.accountId !== accountId,
      );
      for (const folderId of folderIdsToRemove) {
        delete state.tokenIdsByFolderId[folderId];
      }
    });

    /**
     * Handles the removeWallet action to remove folders for all accounts of the wallet
     * and their associated token assignments.
     * @param state - The current state of the token folder slice.
     * @param action - The removeWallet action containing the walletId and accountIds.
     */
    builder.addCase(walletsActions.wallets.removeWallet, (state, action) => {
      const { accountIds } = action.payload;
      const accountIdSet = new Set<string>(accountIds);
      const folderIdsToRemove = state.folders
        .filter(folder => accountIdSet.has(folder.accountId))
        .map(folder => folder.id);
      state.folders = state.folders.filter(
        folder => !accountIdSet.has(folder.accountId),
      );
      for (const folderId of folderIdsToRemove) {
        delete state.tokenIdsByFolderId[folderId];
      }
    });
  },
  selectors: {
    selectAllFolders: state => state.folders,
    selectFolderById: (state, folderId: FolderId) =>
      state.folders.find(folder => folder.id === folderId),
    selectTokenIdsByFolderId: (state): TokenIdsByFolderId =>
      state.tokenIdsByFolderId,
    selectTokenIdsForFolderId: (state, folderId: FolderId): TokenId[] =>
      state.tokenIdsByFolderId[folderId] ?? EMPTY_FOLDER_TOKEN_IDS,
  },
});

export const tokenFolderReducers = {
  [tokenFolderSlice.name]: tokenFolderSlice.reducer,
};

export const tokenFolderActions = { ...tokenFolderSlice.actions };

const selectFolderIdsByTokenId = markParameterizedSelector(
  createSelector(
    tokenFolderSlice.selectors.selectTokenIdsByFolderId,
    (_: unknown, tokenId: TokenId) => tokenId,
    (tokenIdsByFolderId, tokenId): FolderId[] => {
      const folderIds: FolderId[] = [];
      for (const folderId in tokenIdsByFolderId) {
        const tokenIds = tokenIdsByFolderId[folderId as FolderId];
        if (tokenIds?.includes(tokenId)) {
          folderIds.push(folderId as FolderId);
        }
      }
      return folderIds;
    },
  ),
);

export const tokenFolderSelectors = {
  ...tokenFolderSlice.selectors,
  selectFolderIdsByTokenId,
};
