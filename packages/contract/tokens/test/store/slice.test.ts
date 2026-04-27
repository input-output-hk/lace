import { beforeEach, describe, expect, it } from 'vitest';

import { FolderId, TokenId } from '../../src';
import { tokensSelectors } from '../../src/store/slice/slice';

import { createMockToken } from './mock-tokens';

import type { RawTokensState } from '../../src/store/slice/rawTokensSlice';
import type { TokenIdsByFolderId } from '../../src/store/slice/tokenFolderSlice';
import type { TokensMetadataState } from '../../src/store/slice/tokensMetadataSlice';
import type { Folder } from '../../src/store/types';
import type { Token, StoredTokenMetadata } from '../../src/types';
import type { State } from '@lace-contract/module';
import type { AccountId } from '@lace-contract/wallet-repo';

const createStateWithTokens = (
  tokens: Token[],
  options?: {
    tokenIdsByFolderId?: TokenIdsByFolderId;
    folders?: Folder[];
  },
) => {
  const rawTokensState: RawTokensState = {};
  const tokensMetadataState: TokensMetadataState = { byTokenId: {} };

  tokens.forEach(token => {
    // Create rawTokens structure (by account -> address -> tokenId)
    if (!rawTokensState[token.accountId]) {
      rawTokensState[token.accountId] = {};
    }
    if (!rawTokensState[token.accountId]![token.address]) {
      rawTokensState[token.accountId]![token.address] = {};
    }

    rawTokensState[token.accountId]![token.address]![token.tokenId] = {
      tokenId: token.tokenId,
      available: token.available,
      pending: token.pending,
      accountId: token.accountId,
      address: token.address,
      blockchainName: token.blockchainName,
    };

    // Create tokensMetadata structure
    if (token.metadata) {
      const storedMetadata: StoredTokenMetadata = {
        tokenId: token.tokenId,
        ...token.metadata,
      };
      tokensMetadataState.byTokenId[token.tokenId] = storedMetadata;
    }
  });

  return {
    rawTokens: rawTokensState,
    tokensMetadata: tokensMetadataState,
    tokenFolders: {
      folders: options?.folders ?? [],
      tokenIdsByFolderId: options?.tokenIdsByFolderId ?? {},
    },
  } as unknown as State;
};

describe('tokens slice selectors', () => {
  describe('selectFolderSelectableTokens', () => {
    let folderId: FolderId;
    let accountId: AccountId;
    let tokens: Token[];
    let state: State;

    beforeEach(() => {
      folderId = FolderId('folder-1');
      accountId = 'test-account' as AccountId;
      tokens = [
        createMockToken({ id: 'token-1' }), // will be in target folder via assignment
        createMockToken({ id: 'token-2' }), // no folder
        createMockToken({ id: 'token-3' }), // no folder
        createMockToken({ id: 'token-4' }), // will be in different folder via assignment
      ];
      state = createStateWithTokens(tokens, {
        tokenIdsByFolderId: {
          [FolderId('folder-1')]: [TokenId('token-1')],
          [FolderId('folder-2')]: [TokenId('token-4')],
        },
      });
    });

    it('should return correct number of selectable tokens', () => {
      const result = tokensSelectors.tokens.selectFolderSelectableTokens(
        state,
        { accountId, folderId },
      );
      expect(result).toHaveLength(3);
    });

    it('should mark tokens already in folder as selected', () => {
      const result = tokensSelectors.tokens.selectFolderSelectableTokens(
        state,
        { accountId, folderId },
      );
      const token1 = result.find(t => t.tokenId === TokenId('token-1'));
      expect(token1?.isSelected).toBe(true);
    });

    it('should mark tokens without folders as unselected', () => {
      const result = tokensSelectors.tokens.selectFolderSelectableTokens(
        state,
        { accountId, folderId },
      );
      const token2 = result.find(t => t.tokenId === TokenId('token-2'));
      expect(token2?.isSelected).toBe(false);
    });

    it('should mark tokens without folderIds metadata as unselected', () => {
      const result = tokensSelectors.tokens.selectFolderSelectableTokens(
        state,
        { accountId, folderId },
      );
      const token3 = result.find(t => t.tokenId === TokenId('token-3'));
      expect(token3?.isSelected).toBe(false);
    });

    it('should exclude tokens from different folders', () => {
      const result = tokensSelectors.tokens.selectFolderSelectableTokens(
        state,
        { accountId, folderId },
      );
      const token4 = result.find(t => t.tokenId === TokenId('token-4'));
      expect(token4).toBeUndefined();
    });

    it('should return empty array when no tokens are available', () => {
      const emptyState = createStateWithTokens([]);
      const emptyResult = tokensSelectors.tokens.selectFolderSelectableTokens(
        emptyState,
        { accountId, folderId },
      );

      expect(emptyResult).toEqual([]);
    });
  });
});
