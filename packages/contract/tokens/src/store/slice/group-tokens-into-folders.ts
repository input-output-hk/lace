import type { FolderId, Token, TokenId } from '../..';
import type { Folder } from '../types';
import type { TokenIdsByFolderId } from './tokenFolderSlice';

type FolderWithTokens = Folder & { tokens: Token[] };

export type GroupedTokens = {
  nonFolderTokens: Token[];
  folders: FolderWithTokens[];
};

/**
 * Groups tokens into their respective folders using the assignment map.
 *
 * @param tokens An array of token objects to be grouped.
 * @param tokenFolders An array of available folder objects.
 * @param tokenIdsByFolderId A map of folder IDs to arrays of token IDs.
 * @returns An object containing tokens that are not in any folder and folders with their assigned tokens.
 */
export const groupTokensIntoFolders = (
  tokens: Token[],
  tokenFolders: Folder[],
  tokenIdsByFolderId: TokenIdsByFolderId,
): GroupedTokens => {
  const tokensByTokenId = new Map<TokenId, Token>();

  // Build a map for quick token lookup
  for (const token of tokens) {
    tokensByTokenId.set(token.tokenId, token);
  }

  // Build a set of valid folder IDs
  const validFolderIds = new Set(tokenFolders.map(folder => folder.id));

  // Build a map of tokenId -> folderIds from the assignment map
  const folderIdsByTokenId = new Map<TokenId, FolderId[]>();
  for (const folderId in tokenIdsByFolderId) {
    if (!validFolderIds.has(folderId as FolderId)) continue;
    const tokenIds = tokenIdsByFolderId[folderId as FolderId];
    if (!tokenIds) continue;
    for (const tokenId of tokenIds) {
      const folderIds = folderIdsByTokenId.get(tokenId);
      if (folderIds) {
        folderIds.push(folderId as FolderId);
      } else {
        folderIdsByTokenId.set(tokenId, [folderId as FolderId]);
      }
    }
  }

  const nonFolderTokens: Token[] = [];
  const folderTokensMap = new Map<FolderId, Token[]>();

  for (const token of tokens) {
    const folderIds = folderIdsByTokenId.get(token.tokenId);

    if (!folderIds || folderIds.length === 0) {
      nonFolderTokens.push(token);
      continue;
    }

    for (const folderId of folderIds) {
      const tokensInFolder = folderTokensMap.get(folderId);
      if (tokensInFolder) {
        tokensInFolder.push(token);
      } else {
        folderTokensMap.set(folderId, [token]);
      }
    }
  }

  const folders = tokenFolders.map(folder => ({
    ...folder,
    tokens: folderTokensMap.get(folder.id) || [],
  }));

  return {
    nonFolderTokens,
    folders,
  };
};
