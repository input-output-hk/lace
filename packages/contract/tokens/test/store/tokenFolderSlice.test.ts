import { beforeEach, describe, expect, it } from 'vitest';

import { FolderId, TokenId } from '../../src';
import {
  tokenFolderActions as actions,
  tokenFolderSelectors as selectors,
  tokenFolderReducers,
} from '../../src/store/slice/tokenFolderSlice';

import type { TokenIdsByFolderId } from '../../src/store/slice/tokenFolderSlice';
import type { Folder } from '../../src/store/types';
import type { State } from '@lace-contract/module';

type TokenFolderState = {
  folders: Folder[];
  tokenIdsByFolderId: TokenIdsByFolderId;
};

const createStateWithTokenFolders = (tokenFolders: TokenFolderState) =>
  ({
    tokenFolders,
  } as State);

describe('tokenFolder slice', () => {
  let initialState: TokenFolderState;

  beforeEach(() => {
    initialState = {
      folders: [],
      tokenIdsByFolderId: {},
    };
  });

  describe('reducers', () => {
    it('should create a new folder', () => {
      const folder: Folder = {
        id: FolderId('folder-1'),
        name: 'My Tokens',
        accountId: 'account-1',
      };

      const action = actions.createFolder(folder);
      const state = tokenFolderReducers.tokenFolders(initialState, action);

      expect(state.folders).toHaveLength(1);
      expect(state.folders[0]).toEqual(folder);
    });

    it('should add new folder to the beginning of the list', () => {
      const existingFolder: Folder = {
        id: FolderId('folder-1'),
        name: 'Existing Folder',
        accountId: 'account-1',
      };

      initialState = {
        folders: [existingFolder],
        tokenIdsByFolderId: {},
      };

      const newFolder: Folder = {
        id: FolderId('folder-2'),
        name: 'New Folder',
        accountId: 'account-1',
      };

      const action = actions.createFolder(newFolder);
      const state = tokenFolderReducers.tokenFolders(initialState, action);

      expect(state.folders).toHaveLength(2);
      expect(state.folders[0]).toEqual(newFolder);
      expect(state.folders[1]).toEqual(existingFolder);
    });

    it('should remove a folder by id', () => {
      const folder1: Folder = {
        id: FolderId('folder-1'),
        name: 'Folder 1',
        accountId: 'account-1',
      };

      const folder2: Folder = {
        id: FolderId('folder-2'),
        name: 'Folder 2',
        accountId: 'account-1',
      };

      initialState = {
        folders: [folder1, folder2],
        tokenIdsByFolderId: {},
      };

      const action = actions.deleteFolder(FolderId('folder-1'));
      const state = tokenFolderReducers.tokenFolders(initialState, action);

      expect(state.folders).toHaveLength(1);
      expect(state.folders[0]).toEqual(folder2);
    });

    it('should not change state when removing non-existent folder', () => {
      const folder: Folder = {
        id: FolderId('folder-1'),
        name: 'Existing Folder',
        accountId: 'account-1',
      };

      initialState = {
        folders: [folder],
        tokenIdsByFolderId: {},
      };

      const action = actions.deleteFolder(FolderId('non-existent'));
      const state = tokenFolderReducers.tokenFolders(initialState, action);

      expect(state.folders).toHaveLength(1);
      expect(state.folders[0]).toEqual(folder);
    });

    it('should handle removing folder from empty state', () => {
      const action = actions.deleteFolder(FolderId('folder-1'));
      const state = tokenFolderReducers.tokenFolders(initialState, action);

      expect(state.folders).toHaveLength(0);
    });

    it('should update a folder name', () => {
      const folder: Folder = {
        id: FolderId('folder-1'),
        name: 'Old Name',
        accountId: 'account-1',
      };

      initialState = {
        folders: [folder],
        tokenIdsByFolderId: {},
      };

      const updatedFolder = {
        id: FolderId('folder-1'),
        name: 'New Name',
      };

      const action = actions.updateFolder(updatedFolder);
      const state = tokenFolderReducers.tokenFolders(initialState, action);

      expect(state.folders).toHaveLength(1);
      expect(state.folders[0].name).toBe('New Name');
    });
  });

  describe('selectors', () => {
    describe('selectAllFolders', () => {
      it('should return empty array for initial state', () => {
        const state = createStateWithTokenFolders(initialState);
        const result = selectors.selectAllFolders(state);

        expect(result).toEqual([]);
      });

      it('should return all folders', () => {
        const folder1: Folder = {
          id: FolderId('folder-1'),
          name: 'Folder 1',
          accountId: 'account-1',
        };

        const folder2: Folder = {
          id: FolderId('folder-2'),
          name: 'Folder 2',
          accountId: 'account-1',
        };

        const stateWithFolders = {
          folders: [folder1, folder2],
          tokenIdsByFolderId: {},
        };

        const state = createStateWithTokenFolders(stateWithFolders);
        const result = selectors.selectAllFolders(state);

        expect(result).toEqual([folder1, folder2]);
      });
    });

    describe('selectFolderById', () => {
      it('should return undefined for non-existent folder', () => {
        const state = createStateWithTokenFolders(initialState);
        const result = selectors.selectFolderById(
          state,
          FolderId('non-existent'),
        );

        expect(result).toBeUndefined();
      });

      it('should return the correct folder by id', () => {
        const folder1: Folder = {
          id: FolderId('folder-1'),
          name: 'Folder 1',
          accountId: 'account-1',
        };

        const folder2: Folder = {
          id: FolderId('folder-2'),
          name: 'Folder 2',
          accountId: 'account-1',
        };

        const stateWithFolders = {
          folders: [folder1, folder2],
          tokenIdsByFolderId: {},
        };

        const state = createStateWithTokenFolders(stateWithFolders);
        const result = selectors.selectFolderById(state, FolderId('folder-2'));

        expect(result).toEqual(folder2);
      });

      it('should return undefined when searching empty folders', () => {
        const state = createStateWithTokenFolders(initialState);
        const result = selectors.selectFolderById(state, FolderId('folder-1'));

        expect(result).toBeUndefined();
      });
    });

    describe('selectTokenIdsByFolderId', () => {
      it('should return empty object for initial state', () => {
        const state = createStateWithTokenFolders(initialState);
        const result = selectors.selectTokenIdsByFolderId(state);

        expect(result).toEqual({});
      });

      it('should return all token IDs by folder ID', () => {
        const tokenIdsByFolderId: TokenIdsByFolderId = {
          [FolderId('folder-1')]: [TokenId('token-1'), TokenId('token-2')],
          [FolderId('folder-2')]: [TokenId('token-1')],
        };

        const stateWithAssignments = {
          folders: [],
          tokenIdsByFolderId,
        };

        const state = createStateWithTokenFolders(stateWithAssignments);
        const result = selectors.selectTokenIdsByFolderId(state);

        expect(result).toEqual(tokenIdsByFolderId);
      });
    });

    describe('selectTokenIdsForFolderId', () => {
      it('should return empty array for non-existent folder', () => {
        const state = createStateWithTokenFolders(initialState);
        const result = selectors.selectTokenIdsForFolderId(
          state,
          FolderId('non-existent'),
        );

        expect(result).toEqual([]);
      });

      it('should return token IDs for a specific folder', () => {
        const stateWithAssignments = {
          folders: [],
          tokenIdsByFolderId: {
            [FolderId('folder-1')]: [TokenId('token-1'), TokenId('token-2')],
            [FolderId('folder-2')]: [TokenId('token-3')],
          },
        };

        const state = createStateWithTokenFolders(stateWithAssignments);
        const result = selectors.selectTokenIdsForFolderId(
          state,
          FolderId('folder-1'),
        );

        expect(result).toEqual([TokenId('token-1'), TokenId('token-2')]);
      });
    });

    describe('selectFolderIdsByTokenId', () => {
      it('should return empty array for token not in any folder', () => {
        const state = createStateWithTokenFolders(initialState);
        const result = selectors.selectFolderIdsByTokenId(
          state,
          TokenId('token-1'),
        );

        expect(result).toEqual([]);
      });

      it('should return folder IDs for a specific token', () => {
        const stateWithAssignments = {
          folders: [],
          tokenIdsByFolderId: {
            [FolderId('folder-1')]: [TokenId('token-1')],
            [FolderId('folder-2')]: [TokenId('token-1')],
            [FolderId('folder-3')]: [TokenId('token-2')],
          },
        };

        const state = createStateWithTokenFolders(stateWithAssignments);
        const result = selectors.selectFolderIdsByTokenId(
          state,
          TokenId('token-1'),
        );

        expect(result).toEqual([FolderId('folder-1'), FolderId('folder-2')]);
      });
    });
  });

  describe('token assignment reducers', () => {
    it('should add tokens to folder', () => {
      const action = actions.addTokensToFolder({
        tokenIds: [TokenId('token-1'), TokenId('token-2')],
        folderId: FolderId('folder-1'),
      });

      const state = tokenFolderReducers.tokenFolders(initialState, action);

      expect(state.tokenIdsByFolderId[FolderId('folder-1')]).toEqual([
        TokenId('token-1'),
        TokenId('token-2'),
      ]);
    });

    it('should not add duplicate token-folder assignments', () => {
      initialState = {
        folders: [],
        tokenIdsByFolderId: {
          [FolderId('folder-1')]: [TokenId('token-1')],
        },
      };

      const action = actions.addTokensToFolder({
        tokenIds: [TokenId('token-1'), TokenId('token-2')],
        folderId: FolderId('folder-1'),
      });

      const state = tokenFolderReducers.tokenFolders(initialState, action);

      expect(state.tokenIdsByFolderId[FolderId('folder-1')]).toEqual([
        TokenId('token-1'),
        TokenId('token-2'),
      ]);
    });

    it('should remove tokens from folder', () => {
      initialState = {
        folders: [],
        tokenIdsByFolderId: {
          [FolderId('folder-1')]: [TokenId('token-1'), TokenId('token-2')],
          [FolderId('folder-2')]: [TokenId('token-1')],
        },
      };

      const action = actions.removeTokensFromFolder({
        tokenIds: [TokenId('token-1')],
        folderId: FolderId('folder-1'),
      });

      const state = tokenFolderReducers.tokenFolders(initialState, action);

      expect(state.tokenIdsByFolderId[FolderId('folder-1')]).toEqual([
        TokenId('token-2'),
      ]);
      expect(state.tokenIdsByFolderId[FolderId('folder-2')]).toEqual([
        TokenId('token-1'),
      ]);
    });

    it('should remove all tokens from folder', () => {
      initialState = {
        folders: [],
        tokenIdsByFolderId: {
          [FolderId('folder-1')]: [TokenId('token-1'), TokenId('token-2')],
          [FolderId('folder-2')]: [TokenId('token-3')],
        },
      };

      const action = actions.removeAllTokensFromFolder(FolderId('folder-1'));

      const state = tokenFolderReducers.tokenFolders(initialState, action);

      expect(state.tokenIdsByFolderId[FolderId('folder-1')]).toBeUndefined();
      expect(state.tokenIdsByFolderId[FolderId('folder-2')]).toEqual([
        TokenId('token-3'),
      ]);
    });

    it('should remove assignments when deleting a folder', () => {
      const folder: Folder = {
        id: FolderId('folder-1'),
        name: 'Folder 1',
        accountId: 'account-1',
      };

      initialState = {
        folders: [folder],
        tokenIdsByFolderId: {
          [FolderId('folder-1')]: [TokenId('token-1'), TokenId('token-2')],
          [FolderId('folder-2')]: [TokenId('token-3')],
        },
      };

      const action = actions.deleteFolder(FolderId('folder-1'));

      const state = tokenFolderReducers.tokenFolders(initialState, action);

      expect(state.folders).toHaveLength(0);
      expect(state.tokenIdsByFolderId[FolderId('folder-1')]).toBeUndefined();
      expect(state.tokenIdsByFolderId[FolderId('folder-2')]).toEqual([
        TokenId('token-3'),
      ]);
    });
  });
});
