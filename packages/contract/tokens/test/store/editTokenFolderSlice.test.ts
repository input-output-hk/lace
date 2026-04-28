import { beforeEach, describe, expect, it } from 'vitest';

import { FolderId, TokenId } from '../../src';
import {
  editTokenFolderFlowActions as actions,
  editTokenFolderFlowSelectors as selectors,
  editTokenFolderFlowReducers,
} from '../../src/store/slice/editTokenFolderFlowSlice';

import type {
  EditTokenFolderState,
  EditTokenFolderStateOpen,
} from '../../src/store/slice/editTokenFolderFlowSlice';
import type { State } from '@lace-contract/module';

const createStateWithEditTokenFolder = (
  editTokenFolderFlow: EditTokenFolderState,
) =>
  ({
    editTokenFolderFlow,
  } as State);

describe('editTokenFolder slice', () => {
  let initialState: EditTokenFolderState;

  beforeEach(() => {
    initialState = {
      status: 'Idle',
    };
  });

  describe('reducers', () => {
    describe('Idle state', () => {
      it('should start preparing from Idle state', () => {
        const folderId = FolderId('folder-1');
        const action = actions.startEditing(folderId);
        const state = editTokenFolderFlowReducers.editTokenFolderFlow(
          initialState,
          action,
        );

        expect(state.status).toBe('Preparing');
      });
    });

    describe('Editing state', () => {
      it('should confirm name change from Editing state', () => {
        const currentState: EditTokenFolderState = {
          status: 'Editing',
          folderId: FolderId('folder-1'),
          selectedTokens: [],
          folderName: '',
          currentTokensInFolder: [],
        };

        const action = actions.confirmNameChange('New Name');
        const state = editTokenFolderFlowReducers.editTokenFolderFlow(
          currentState,
          action,
        );

        expect(state.status).toBe('ConfirmingNameChange');
        expect((state as EditTokenFolderStateOpen).folderName).toBe('New Name');
        expect((state as EditTokenFolderStateOpen).folderId).toBe(
          FolderId('folder-1'),
        );
      });

      it('should proceed to delete from Editing state', () => {
        const currentState: EditTokenFolderState = {
          status: 'Editing',
          folderId: FolderId('folder-1'),
          selectedTokens: [],
          folderName: '',
          currentTokensInFolder: [],
        };

        const action = actions.delete();
        const state = editTokenFolderFlowReducers.editTokenFolderFlow(
          currentState,
          action,
        );

        expect(state.status).toBe('Deleting');
        expect((state as EditTokenFolderStateOpen).folderId).toBe(
          FolderId('folder-1'),
        );
      });

      it('should select tokens from Preparing state', () => {
        const currentState: EditTokenFolderState = {
          status: 'Preparing',
          folderId: FolderId('folder-1'),
        };

        const currentTokens = [TokenId('token-1'), TokenId('token-2')];
        const action = actions.proceedToEditing({
          selectedTokens: [],
          currentTokensInFolder: currentTokens,
          folderName: '',
        });
        const state = editTokenFolderFlowReducers.editTokenFolderFlow(
          currentState,
          action,
        );

        expect(state.status).toBe('Editing');
        expect(
          (state as EditTokenFolderStateOpen).currentTokensInFolder,
        ).toEqual(currentTokens);
      });
    });

    describe('SelectingTokens state', () => {
      it('should set tokens in SelectingTokens state', () => {
        const currentState: EditTokenFolderState = {
          status: 'SelectingTokens',
          folderId: FolderId('folder-1'),
          selectedTokens: [],
          folderName: '',
          currentTokensInFolder: [TokenId('token-1')],
        };

        const newTokens = [TokenId('token-1'), TokenId('token-2')];
        const action = actions.setTokens(newTokens);
        const state = editTokenFolderFlowReducers.editTokenFolderFlow(
          currentState,
          action,
        );

        expect(state.status).toBe('SelectingTokens');
        expect((state as EditTokenFolderStateOpen).selectedTokens).toEqual(
          newTokens,
        );
      });

      it('should go back to Editing from SelectingTokens', () => {
        const currentState: EditTokenFolderState = {
          status: 'SelectingTokens',
          folderId: FolderId('folder-1'),
          selectedTokens: [TokenId('token-1')],
          folderName: '',
          currentTokensInFolder: [TokenId('token-1')],
        };

        const action = actions.selectingTokensBack();
        const state = editTokenFolderFlowReducers.editTokenFolderFlow(
          currentState,
          action,
        );

        expect(state.status).toBe('Editing');
        expect((state as EditTokenFolderStateOpen).selectedTokens).toEqual([
          TokenId('token-1'),
        ]);
      });

      it('should complete token selection from SelectingTokens', () => {
        const currentState: EditTokenFolderState = {
          status: 'SelectingTokens',
          folderId: FolderId('folder-1'),
          selectedTokens: [TokenId('token-1')],
          folderName: '',
          currentTokensInFolder: [TokenId('token-1')],
        };

        const action = actions.selectingTokensComplete();
        const state = editTokenFolderFlowReducers.editTokenFolderFlow(
          currentState,
          action,
        );

        expect(state.status).toBe('UpdatingTokens');
        expect((state as EditTokenFolderStateOpen).selectedTokens).toEqual([
          TokenId('token-1'),
        ]);
      });
    });

    describe('ConfirmingNameChange state', () => {
      it('should finalize from ConfirmingNameChange and reset to initial state', () => {
        const currentState: EditTokenFolderState = {
          status: 'ConfirmingNameChange',
          folderId: FolderId('folder-1'),
          selectedTokens: [],
          folderName: 'New Name',
          currentTokensInFolder: [],
        };

        const action = actions.finalize();
        const state = editTokenFolderFlowReducers.editTokenFolderFlow(
          currentState,
          action,
        );

        expect(state).toEqual(initialState);
      });
    });

    describe('Deleting state', () => {
      it('should finalize from Deleting and reset to initial state', () => {
        const currentState: EditTokenFolderState = {
          status: 'Deleting',
          folderId: FolderId('folder-1'),
          selectedTokens: [],
          folderName: '',
          currentTokensInFolder: [],
        };

        const action = actions.finalize();
        const state = editTokenFolderFlowReducers.editTokenFolderFlow(
          currentState,
          action,
        );

        expect(state).toEqual(initialState);
      });
    });

    describe('UpdatingTokens state', () => {
      it('should finalize from UpdatingTokens and reset to initial state', () => {
        const currentState: EditTokenFolderState = {
          status: 'UpdatingTokens',
          folderId: FolderId('folder-1'),
          selectedTokens: [TokenId('token-1')],
          folderName: '',
          currentTokensInFolder: [],
        };

        const action = actions.finalize();
        const state = editTokenFolderFlowReducers.editTokenFolderFlow(
          currentState,
          action,
        );

        expect(state).toEqual(initialState);
      });
    });

    describe('Cross-state actions', () => {
      it('should cancel from any state and reset to initial state', () => {
        const currentState: EditTokenFolderState = {
          status: 'SelectingTokens',
          folderId: FolderId('folder-1'),
          selectedTokens: [TokenId('token-1')],
          folderName: 'Test',
          currentTokensInFolder: [TokenId('token-2')],
        };

        const action = actions.cancel();
        const state = editTokenFolderFlowReducers.editTokenFolderFlow(
          currentState,
          action,
        );

        expect(state).toEqual(initialState);
      });
    });
  });

  describe('selectors', () => {
    it('should select the complete state', () => {
      const state: EditTokenFolderState = {
        status: 'Editing',
        folderId: FolderId('folder-1'),
        selectedTokens: [TokenId('token-1')],
        folderName: 'Test Folder',
        currentTokensInFolder: [TokenId('token-2')],
      };

      const result = selectors.selectState(
        createStateWithEditTokenFolder(state),
      );

      expect(result).toEqual(state);
    });
  });
});
