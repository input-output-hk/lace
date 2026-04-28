import { beforeEach, describe, expect, it } from 'vitest';

import { TokenId } from '../../src';
import {
  createTokenFolderFlowActions as actions,
  createTokenFolderFlowSelectors as selectors,
  createTokenFolderFlowReducers,
} from '../../src/store/slice/createTokenFolderFlowSlice';

import type {
  CreateTokenFolderFlowState,
  CreateTokenFolderFlowStateOpen,
} from '../../src/store/slice/createTokenFolderFlowSlice';
import type { State } from '@lace-contract/module';

const createStateWithCreateTokenFolder = (
  createTokenFolderFlow: CreateTokenFolderFlowState,
) =>
  ({
    createTokenFolderFlow,
  } as State);

describe('createTokenFolder slice', () => {
  let initialState: CreateTokenFolderFlowState;
  const testAccountId = 'account-1';

  beforeEach(() => {
    initialState = {
      status: 'Idle',
    };
  });

  describe('reducers', () => {
    describe('Idle state', () => {
      it('should start creation from Idle state with accountId', () => {
        const action = actions.startCreation(testAccountId);
        const state = createTokenFolderFlowReducers.createTokenFolderFlow(
          initialState,
          action,
        );

        expect(state.status).toBe('NamingFolder');
        expect((state as CreateTokenFolderFlowStateOpen).accountId).toBe(
          testAccountId,
        );
        expect((state as CreateTokenFolderFlowStateOpen).folderName).toBe('');
        expect(
          (state as CreateTokenFolderFlowStateOpen).selectedTokens,
        ).toEqual([]);
      });
    });

    describe('NamingFolder state', () => {
      it('should proceed to SelectingTokens from NamingFolder', () => {
        const currentState: CreateTokenFolderFlowState = {
          status: 'NamingFolder',
          accountId: testAccountId,
          folderName: '',
          selectedTokens: [],
        };

        const action = actions.namingFolderNext('My Folder');
        const state = createTokenFolderFlowReducers.createTokenFolderFlow(
          currentState,
          action,
        );

        expect(state.status).toBe('SelectingTokens');
        expect((state as CreateTokenFolderFlowStateOpen).folderName).toBe(
          'My Folder',
        );
        expect(
          (state as CreateTokenFolderFlowStateOpen).selectedTokens,
        ).toEqual([]);
      });
    });

    describe('SelectingTokens state', () => {
      it('should add token to selectedTokens in SelectingTokens state', () => {
        const currentState: CreateTokenFolderFlowState = {
          status: 'SelectingTokens',
          accountId: testAccountId,
          folderName: 'My Folder',
          selectedTokens: [],
        };

        const tokenId = TokenId('token-1');
        const action = actions.addToken(tokenId);
        const state = createTokenFolderFlowReducers.createTokenFolderFlow(
          currentState,
          action,
        );

        expect(state.status).toBe('SelectingTokens');
        expect(
          (state as CreateTokenFolderFlowStateOpen).selectedTokens,
        ).toContain(tokenId);
      });

      it('should remove token from selectedTokens in SelectingTokens state', () => {
        const tokenId1 = TokenId('token-1');
        const tokenId2 = TokenId('token-2');
        const currentState: CreateTokenFolderFlowState = {
          status: 'SelectingTokens',
          accountId: testAccountId,
          folderName: 'My Folder',
          selectedTokens: [tokenId1, tokenId2],
        };

        const action = actions.removeToken(tokenId1);
        const state = createTokenFolderFlowReducers.createTokenFolderFlow(
          currentState,
          action,
        );

        expect(state.status).toBe('SelectingTokens');
        expect(
          (state as CreateTokenFolderFlowStateOpen).selectedTokens,
        ).toEqual([tokenId2]);
      });

      it('should go back to NamingFolder from SelectingTokens', () => {
        const currentState: CreateTokenFolderFlowState = {
          status: 'SelectingTokens',
          accountId: testAccountId,
          folderName: 'My Folder',
          selectedTokens: [TokenId('token-1')],
        };

        const action = actions.selectingTokensBack();
        const state = createTokenFolderFlowReducers.createTokenFolderFlow(
          currentState,
          action,
        );

        expect(state.status).toBe('NamingFolder');
        expect((state as CreateTokenFolderFlowStateOpen).folderName).toBe(
          'My Folder',
        );
        expect(
          (state as CreateTokenFolderFlowStateOpen).selectedTokens,
        ).toEqual([TokenId('token-1')]);
      });

      it('should proceed to CreatingFolder from SelectingTokens', () => {
        const currentState: CreateTokenFolderFlowState = {
          status: 'SelectingTokens',
          accountId: testAccountId,
          folderName: 'My Folder',
          selectedTokens: [TokenId('token-1')],
        };

        const action = actions.selectingTokensNext();
        const state = createTokenFolderFlowReducers.createTokenFolderFlow(
          currentState,
          action,
        );

        expect(state.status).toBe('CreatingFolder');
        expect((state as CreateTokenFolderFlowStateOpen).folderName).toBe(
          'My Folder',
        );
        expect(
          (state as CreateTokenFolderFlowStateOpen).selectedTokens,
        ).toEqual([TokenId('token-1')]);
      });
    });

    describe('CreatingFolder state', () => {
      it('should finalize from CreatingFolder and reset to initial state', () => {
        const currentState: CreateTokenFolderFlowState = {
          status: 'CreatingFolder',
          accountId: testAccountId,
          folderName: 'My Folder',
          selectedTokens: [TokenId('token-1')],
        };

        const action = actions.finalize();
        const state = createTokenFolderFlowReducers.createTokenFolderFlow(
          currentState,
          action,
        );

        expect(state).toEqual(initialState);
      });
    });

    describe('Cross-state actions', () => {
      it('should cancel from any state and reset to initial state', () => {
        const currentState: CreateTokenFolderFlowState = {
          status: 'SelectingTokens',
          accountId: testAccountId,
          folderName: 'My Folder',
          selectedTokens: [TokenId('token-1')],
        };

        const action = actions.cancel();
        const state = createTokenFolderFlowReducers.createTokenFolderFlow(
          currentState,
          action,
        );

        expect(state).toEqual(initialState);
      });
    });
  });

  describe('selectors', () => {
    it('should select the complete state', () => {
      const state: CreateTokenFolderFlowState = {
        status: 'NamingFolder',
        accountId: testAccountId,
        folderName: 'Test Folder',
        selectedTokens: [TokenId('token-1')],
      };

      const result = selectors.selectState(
        createStateWithCreateTokenFolder(state),
      );

      expect(result).toEqual(state);
    });
  });
});
