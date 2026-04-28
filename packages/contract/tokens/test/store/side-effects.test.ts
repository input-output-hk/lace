import { testSideEffect } from '@lace-lib/util-dev';
import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { FolderId, TokenId, tokensActions } from '../../src';
import {
  handleFolderCreation,
  handleFolderDeleting,
  handleFolderEditPreparing,
  handleFolderNameChange,
  handleTokensUpdating,
  initializeSideEffects,
} from '../../src/store/side-effects';

import type { CreateTokenFolderFlowState } from '../../src/store/slice/createTokenFolderFlowSlice';
import type { EditTokenFolderState } from '../../src/store/slice/editTokenFolderFlowSlice';
import type { Logger } from 'ts-log';

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-123'),
}));

const actions = {
  ...tokensActions,
};

const testAccountId = 'account-1';

const makeCreateTokenFolderState = (
  overrides: Partial<CreateTokenFolderFlowState> = {},
): CreateTokenFolderFlowState => ({
  status: 'CreatingFolder',
  accountId: testAccountId,
  folderName: '',
  selectedTokens: [],
  ...overrides,
});

const makeEditTokenFolderState = (
  overrides: Partial<EditTokenFolderState> = {},
): EditTokenFolderState => ({
  status: 'Deleting',
  folderId: '' as FolderId,
  selectedTokens: [],
  folderName: '',
  currentTokensInFolder: [],
  ...overrides,
});

describe('tokens side effects', () => {
  const mockLogger: Logger = dummyLogger;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('handleFolderCreation', () => {
    it('should create folder and add tokens when selected tokens exist', () => {
      const state = makeCreateTokenFolderState({
        folderName: '  My Folder  ',
        selectedTokens: [TokenId('token-1'), TokenId('token-2')],
      });

      testSideEffect(handleFolderCreation, ({ cold, expectObservable }) => {
        return {
          stateObservables: {
            createTokenFolderFlow: {
              selectState$: cold('a', { a: state }),
            },
          },
          dependencies: {
            logger: mockLogger,
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(abc)', {
              a: actions.tokenFolders.createFolder({
                id: FolderId('test-uuid-123'),
                name: 'My Folder',
                accountId: testAccountId,
              }),
              b: actions.createTokenFolderFlow.finalize(),
              c: actions.tokenFolders.addTokensToFolder({
                tokenIds: [TokenId('token-1'), TokenId('token-2')],
                folderId: FolderId('test-uuid-123'),
              }),
            });
          },
        };
      });
    });

    it('should create folder without tokens when no tokens selected', () => {
      const state = makeCreateTokenFolderState({
        folderName: 'My Folder',
      });

      testSideEffect(handleFolderCreation, ({ cold, expectObservable }) => {
        return {
          stateObservables: {
            createTokenFolderFlow: {
              selectState$: cold('a', { a: state }),
            },
          },
          dependencies: {
            logger: mockLogger,
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(ab)', {
              a: actions.tokenFolders.createFolder({
                id: FolderId('test-uuid-123'),
                name: 'My Folder',
                accountId: testAccountId,
              }),
              b: actions.createTokenFolderFlow.finalize(),
            });
          },
        };
      });
    });

    it('should log error and return empty array when folder name is empty', () => {
      const logErrorSpy = vi.spyOn(mockLogger, 'error');
      const state = makeCreateTokenFolderState({
        folderName: '   ',
        selectedTokens: [TokenId('token-1')],
      });

      testSideEffect(
        handleFolderCreation,
        ({ cold, expectObservable, flush }) => {
          return {
            stateObservables: {
              createTokenFolderFlow: {
                selectState$: cold('a', { a: state }),
              },
            },
            dependencies: {
              logger: mockLogger,
              actions,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('');

              flush();

              expect(logErrorSpy).toHaveBeenCalled();
            },
          };
        },
      );
    });
  });

  describe('handleFolderDeleting', () => {
    it('should delete folder when folderId exists', () => {
      const folderId = FolderId('folder-123');
      const state = makeEditTokenFolderState({
        status: 'Deleting',
        folderId,
      });

      testSideEffect(handleFolderDeleting, ({ cold, expectObservable }) => {
        return {
          stateObservables: {
            editTokenFolderFlow: {
              selectState$: cold('a', { a: state }),
            },
          },
          dependencies: {
            logger: mockLogger,
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(ab)', {
              a: actions.tokenFolders.deleteFolder(folderId),
              b: actions.editTokenFolderFlow.finalize(),
            });
          },
        };
      });
    });
  });

  describe('handleFolderNameChange', () => {
    it('should update folder name when valid parameters provided', () => {
      const folderId = FolderId('folder-123');
      const state = makeEditTokenFolderState({
        status: 'ConfirmingNameChange',
        folderId,
        folderName: '  New Name  ',
      });

      testSideEffect(handleFolderNameChange, ({ cold, expectObservable }) => {
        return {
          stateObservables: {
            editTokenFolderFlow: {
              selectState$: cold('a', { a: state }),
            },
          },
          dependencies: {
            logger: mockLogger,
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(ab)', {
              a: actions.tokenFolders.updateFolder({
                id: folderId,
                name: 'New Name',
              }),
              b: actions.editTokenFolderFlow.finalize(),
            });
          },
        };
      });
    });
  });

  describe('handleTokensUpdating', () => {
    it('should add and remove tokens based on selection differences', () => {
      const folderId = FolderId('folder-123');
      const state = makeEditTokenFolderState({
        status: 'UpdatingTokens',
        folderId,
        selectedTokens: [TokenId('token-1'), TokenId('token-3')],
        currentTokensInFolder: [TokenId('token-1'), TokenId('token-2')],
      });

      testSideEffect(handleTokensUpdating, ({ cold, expectObservable }) => {
        return {
          stateObservables: {
            editTokenFolderFlow: {
              selectState$: cold('a', { a: state }),
            },
          },
          dependencies: {
            logger: mockLogger,
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(abc)', {
              a: actions.tokenFolders.addTokensToFolder({
                tokenIds: [TokenId('token-3')],
                folderId,
              }),
              b: actions.tokenFolders.removeTokensFromFolder({
                tokenIds: [TokenId('token-2')],
                folderId,
              }),
              c: actions.editTokenFolderFlow.finalize(),
            });
          },
        };
      });
    });

    it('should only add tokens when no tokens to remove', () => {
      const folderId = FolderId('folder-123');
      const state = makeEditTokenFolderState({
        status: 'UpdatingTokens',
        folderId,
        selectedTokens: [TokenId('token-1'), TokenId('token-2')],
        currentTokensInFolder: [TokenId('token-1')],
      });

      testSideEffect(handleTokensUpdating, ({ cold, expectObservable }) => {
        return {
          stateObservables: {
            editTokenFolderFlow: {
              selectState$: cold('a', { a: state }),
            },
          },
          dependencies: {
            logger: mockLogger,
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(ab)', {
              a: actions.tokenFolders.addTokensToFolder({
                tokenIds: [TokenId('token-2')],
                folderId,
              }),
              b: actions.editTokenFolderFlow.finalize(),
            });
          },
        };
      });
    });

    it('should only remove tokens when no tokens to add', () => {
      const folderId = FolderId('folder-123');
      const state = makeEditTokenFolderState({
        status: 'UpdatingTokens',
        folderId,
        selectedTokens: [TokenId('token-1')],
        currentTokensInFolder: [TokenId('token-1'), TokenId('token-2')],
      });

      testSideEffect(handleTokensUpdating, ({ cold, expectObservable }) => {
        return {
          stateObservables: {
            editTokenFolderFlow: {
              selectState$: cold('a', { a: state }),
            },
          },
          dependencies: {
            logger: mockLogger,
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(ab)', {
              a: actions.tokenFolders.removeTokensFromFolder({
                tokenIds: [TokenId('token-2')],
                folderId,
              }),
              b: actions.editTokenFolderFlow.finalize(),
            });
          },
        };
      });
    });

    it('should only finalize when no tokens to add or remove', () => {
      const folderId = FolderId('folder-123');
      const state = makeEditTokenFolderState({
        status: 'UpdatingTokens',
        folderId,
        selectedTokens: [TokenId('token-1'), TokenId('token-2')],
        currentTokensInFolder: [TokenId('token-1'), TokenId('token-2')],
      });

      testSideEffect(handleTokensUpdating, ({ cold, expectObservable }) => {
        return {
          stateObservables: {
            editTokenFolderFlow: {
              selectState$: cold('a', { a: state }),
            },
          },
          dependencies: {
            logger: mockLogger,
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(a)', {
              a: actions.editTokenFolderFlow.finalize(),
            });
          },
        };
      });
    });
  });

  describe('initializeSideEffects', () => {
    it('should return all side effects', () => {
      const sideEffects = initializeSideEffects();

      expect(sideEffects).toHaveLength(5);
      expect(sideEffects).toContain(handleFolderCreation);
      expect(sideEffects).toContain(handleFolderDeleting);
      expect(sideEffects).toContain(handleFolderEditPreparing);
      expect(sideEffects).toContain(handleFolderNameChange);
      expect(sideEffects).toContain(handleTokensUpdating);
    });
  });
});
