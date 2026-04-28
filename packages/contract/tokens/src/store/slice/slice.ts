import { BigIntMath } from '@cardano-sdk/util';
import { markParameterizedSelector } from '@lace-contract/module';
import { networkSelectors } from '@lace-contract/network';
import { AccountId, walletsSelectors } from '@lace-contract/wallet-repo';
import { BigNumber } from '@lace-sdk/util';
import { createSelector } from '@reduxjs/toolkit';

import { FolderId, TokenId } from '../../value-objects';

import {
  createTokenFolderFlowReducers,
  createTokenFolderFlowActions,
  createTokenFolderFlowSelectors,
} from './createTokenFolderFlowSlice';
import {
  editTokenFolderFlowReducers,
  editTokenFolderFlowActions,
  editTokenFolderFlowSelectors,
} from './editTokenFolderFlowSlice';
import { groupTokensIntoFolders } from './group-tokens-into-folders';
import {
  rawTokensActions,
  rawTokensSelectors,
  rawTokensReducers,
} from './rawTokensSlice';
import {
  buildDistribution,
  calculateTotals,
  collectAccountsWithTokens,
  formatTokenTotals,
} from './token-distribution-helpers';
import {
  tokenFolderActions,
  tokenFolderReducers,
  tokenFolderSelectors,
} from './tokenFolderSlice';
import {
  tokensMetadataActions,
  tokensMetadataReducers,
  tokensMetadataSelectors,
} from './tokensMetadataSlice';
import { createToken } from './utils';

import type { RawToken, Token, TokenMetadata } from '../../types';
import type {
  AccountTokensMap,
  TokenDistributionWithTotals,
  WalletEntitiesMap,
} from '../types';
import type { AnyAccount } from '@lace-contract/wallet-repo';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

/** Stable fallback so input selectors stay referentially stable (Reselect dev checks). */
const EMPTY_WALLET_ENTITIES = {} as WalletEntitiesMap;

type TokenWithSelection = Token & { isSelected: boolean };

const sortTokensByTicker = (t1: Token, t2: Token): number => {
  const t1Ticker = t1.metadata?.ticker ?? '';
  const t2Ticker = t2.metadata?.ticker ?? '';

  return t1Ticker.localeCompare(t2Ticker);
};

const selectAllTokens = createSelector(
  rawTokensSelectors.selectAll,
  tokensMetadataSelectors.selectTokensMetadata,
  (tokens, tokensMetadata) =>
    tokens.map(token => {
      const metadata = tokensMetadata[token.tokenId];
      return createToken(token, metadata);
    }),
);

const selectTokenById = markParameterizedSelector(
  createSelector(
    selectAllTokens,
    (_: unknown, tokenId: string) => tokenId,
    (tokens, tokenId): Token | undefined => {
      return tokens.find(token => token.tokenId === tokenId);
    },
  ),
);

const selectNonFungibleTokens = createSelector(selectAllTokens, tokens =>
  tokens.filter(token => token.metadata?.isNft),
);

const selectFungibleTokens = createSelector(selectAllTokens, tokens =>
  tokens.filter(token => !token.metadata?.isNft),
);

const selectNFTsGroupedInFolders = createSelector(
  selectNonFungibleTokens,
  tokenFolderSelectors.selectAllFolders,
  tokenFolderSelectors.selectTokenIdsByFolderId,
  (nfts, folders, tokenIdsByFolderId) => {
    return groupTokensIntoFolders(nfts, folders, tokenIdsByFolderId);
  },
);

const selectNFTsByFolderId = markParameterizedSelector(
  createSelector(
    selectNonFungibleTokens,
    tokenFolderSelectors.selectTokenIdsByFolderId,
    (_: unknown, folderId: string) => folderId,
    (nfts, tokenIdsByFolderId, folderId) => {
      const tokenIdsInFolder = new Set(
        tokenIdsByFolderId[FolderId(folderId)] ?? [],
      );
      return nfts.filter(nft => tokenIdsInFolder.has(nft.tokenId));
    },
  ),
);

const computeTokenDistributionWithTotals = ({
  rawTokensMap,
  tokensMetadata,
  tokenId,
  walletsEntities,
}: {
  rawTokensMap: Partial<Record<string, AccountTokensMap>>;
  tokensMetadata: Partial<Record<TokenId, TokenMetadata>>;
  tokenId: string;
  walletsEntities: WalletEntitiesMap;
}): TokenDistributionWithTotals => {
  if (!tokenId) {
    return { distribution: [], totals: undefined };
  }

  const accountsWithTokens = collectAccountsWithTokens(
    rawTokensMap,
    tokenId,
    walletsEntities,
  );

  if (accountsWithTokens.length === 0) {
    return { distribution: [], totals: undefined };
  }

  const distribution = buildDistribution(accountsWithTokens, walletsEntities);
  const { totalAvailableStr, totalPendingStr } =
    calculateTotals(accountsWithTokens);
  const totals = formatTokenTotals({
    tokenId,
    totalAvailableString: totalAvailableStr,
    totalPendingString: totalPendingStr,
    tokensMetadata,
  });

  return { distribution, totals };
};

const selectTokensAndMetadata = createSelector(
  [
    rawTokensSelectors.selectAllMap,
    tokensMetadataSelectors.selectTokensMetadata,
    (_: unknown, tokenId: string) => tokenId,
  ],
  (rawTokensMap, tokensMetadata, tokenId) => ({
    rawTokensMap,
    tokensMetadata,
    tokenId,
  }),
);

/**
 * Selector to get all tokens (fungible and NFTs) grouped by accountId.
 * Each account's tokens are aggregated across all addresses within that account.
 * Returns a map: { [accountId]: { fungible: Token[], nfts: Token[] } }
 */
const selectTokensGroupedByAccount = createSelector(
  rawTokensSelectors.selectAllMap,
  tokensMetadataSelectors.selectTokensMetadata,
  (
    rawTokensMap,
    tokensMetadata,
  ): Record<string, { fungible: Token[]; nfts: Token[] }> => {
    const result: Record<string, { fungible: Token[]; nfts: Token[] }> = {};

    // Process each account
    Object.entries(rawTokensMap).forEach(([accountId, addressMap]) => {
      if (!addressMap) return;

      // Aggregate tokens by tokenId within this account
      const tokensByTokenId: Record<string, RawToken[]> = {};

      Object.values(addressMap).forEach(tokenMap => {
        if (!tokenMap) return;
        Object.entries(tokenMap).forEach(([tokenId, token]) => {
          if (!token) return;
          if (!tokensByTokenId[tokenId]) {
            tokensByTokenId[tokenId] = [];
          }
          tokensByTokenId[tokenId].push(token);
        });
      });

      // Create aggregated tokens and separate into fungible/NFTs
      const fungible: Token[] = [];
      const nfts: Token[] = [];

      Object.entries(tokensByTokenId).forEach(([tokenId, tokens]) => {
        const metadata = tokensMetadata[TokenId(tokenId)];
        const firstToken = tokens[0];

        const totalAvailable = BigIntMath.sum(
          tokens.map(t => BigInt(t.available)),
        );
        const totalPending = BigIntMath.sum(tokens.map(t => BigInt(t.pending)));

        const aggregatedRawToken: RawToken = {
          tokenId: TokenId(tokenId),
          available: BigNumber(totalAvailable),
          pending: BigNumber(totalPending),
          accountId: firstToken.accountId,
          address: firstToken.address,
          blockchainName: firstToken.blockchainName,
        };

        const token = createToken(aggregatedRawToken, metadata);

        if (metadata?.isNft) {
          nfts.push(token);
        } else {
          fungible.push(token);
        }
      });

      result[accountId] = { fungible, nfts };
    });

    return result;
  },
);

type FolderSelectableTokensParams = {
  accountId: string;
  folderId?: FolderId;
};

const selectFolderSelectableTokens = createSelector(
  selectTokensGroupedByAccount,
  tokenFolderSelectors.selectTokenIdsByFolderId,
  (_: unknown, params: FolderSelectableTokensParams) => params,
  (
    grouped,
    tokenIdsByFolderId,
    { accountId, folderId },
  ): TokenWithSelection[] => {
    const nfts = grouped[accountId]?.nfts ?? [];

    // Build a map of tokenId -> folderIds from the assignment map
    const folderIdsByTokenId = new Map<TokenId, FolderId[]>();
    for (const folderIdKey in tokenIdsByFolderId) {
      const tokenIds = tokenIdsByFolderId[folderIdKey as FolderId];
      if (!tokenIds) continue;
      for (const tokenId of tokenIds) {
        const folderIds = folderIdsByTokenId.get(tokenId);
        if (folderIds) {
          folderIds.push(folderIdKey as FolderId);
        } else {
          folderIdsByTokenId.set(tokenId, [folderIdKey as FolderId]);
        }
      }
    }

    return nfts.reduce<TokenWithSelection[]>((selectableTokens, token) => {
      const tokenFolderIds = folderIdsByTokenId.get(token.tokenId) ?? [];
      const hasNoFolder = tokenFolderIds.length === 0;
      const isInCurrentFolder =
        folderId != null && tokenFolderIds.includes(folderId);

      if (hasNoFolder || isInCurrentFolder) {
        selectableTokens.push({ ...token, isSelected: isInCurrentFolder });
      }

      return selectableTokens;
    }, []);
  },
);

const selectCreateFolderTokens = createSelector(
  [
    selectFolderSelectableTokens,
    createTokenFolderFlowSelectors.selectState,
    (_: unknown, params: FolderSelectableTokensParams) => params,
  ],
  (folderSelectableTokens, createFolderState): TokenWithSelection[] =>
    folderSelectableTokens.map(token => ({
      ...token,
      isSelected:
        createFolderState.status === 'Idle'
          ? false
          : createFolderState.selectedTokens.includes(token.tokenId),
    })),
);

const selectVisibleAccountIds = createSelector(
  [
    walletsSelectors.wallets.selectAll,
    networkSelectors.network.selectNetworkType,
    networkSelectors.network.selectBlockchainNetworks,
  ],
  (wallets, activeNetworkType, blockchainNetworks) => {
    const allAccounts = wallets.flatMap(
      (wallet): AnyAccount[] => wallet.accounts,
    );

    if (activeNetworkType === undefined) {
      return [];
    }

    const accountsOnActiveNetwork = allAccounts.filter(
      account => account.networkType === activeNetworkType,
    );

    const accountsOnSelectedNetworks = accountsOnActiveNetwork.filter(
      account => {
        const networkConfig = blockchainNetworks[account.blockchainName];
        if (!networkConfig) return true;

        const selectedNetworkId = networkConfig[activeNetworkType];
        return account.blockchainNetworkId === selectedNetworkId;
      },
    );

    return accountsOnSelectedNetworks.map(account => account.accountId);
  },
);

/**
 * Selector to get all fungible tokens aggregated across visible accounts
 * (as determined by current network type + active Cardano chain).
 */
const selectAggregatedFungibleTokensForVisibleAccounts = createSelector(
  selectTokensGroupedByAccount,
  selectVisibleAccountIds,
  (groupedTokens, visibleAccountIds): Token[] => {
    const visibleSet = new Set(visibleAccountIds);

    const visibleFungibleTokens = Object.entries(groupedTokens)
      .filter(([accountId]) => visibleSet.has(AccountId(accountId)))
      .flatMap(([, grouped]) => grouped.fungible ?? []);

    const byTokenId = new Map<string, Token>();

    for (const token of visibleFungibleTokens) {
      const key = String(token.tokenId);
      const existing = byTokenId.get(key);
      if (!existing) {
        byTokenId.set(key, token);
        continue;
      }

      byTokenId.set(key, {
        ...existing,
        available: BigNumber(
          BigInt(existing.available.toString()) +
            BigInt(token.available.toString()),
        ),
        pending: BigNumber(
          BigInt(existing.pending.toString()) +
            BigInt(token.pending.toString()),
        ),
      });
    }

    return Array.from(byTokenId.values());
  },
);

/**
 * Selector to get all fungible tokens aggregated across all accounts
 * Groups tokens by tokenId and aggregates available/pending balances across all accounts and addresses.
 */
const selectAggregatedFungibleTokens = createSelector(
  rawTokensSelectors.selectAll,
  tokensMetadataSelectors.selectTokensMetadata,
  (rawTokens, tokensMetadata): Token[] => {
    // Group tokens by tokenId
    const tokensByTokenId = rawTokens.reduce<Record<string, RawToken[]>>(
      (accumulator, token) => {
        if (!accumulator[token.tokenId]) {
          accumulator[token.tokenId] = [];
        }
        accumulator[token.tokenId].push(token);
        return accumulator;
      },
      {},
    );

    // Aggregate each token group and create Token objects
    return Object.entries(tokensByTokenId)
      .map(([tokenId, tokens]): Token | undefined => {
        const metadata = tokensMetadata[TokenId(tokenId)];

        // Skip NFTs
        if (metadata?.isNft) {
          return undefined;
        }

        // Aggregate available and pending across all accounts
        const totalAvailable = BigIntMath.sum(
          tokens.map(token => BigInt(token.available)),
        );
        const totalPending = BigIntMath.sum(
          tokens.map(token => BigInt(token.pending)),
        );

        // Use the first token's context data (accountId, address, blockchainName)
        const firstToken = tokens[0];

        const aggregatedToken: RawToken = {
          tokenId: TokenId(tokenId),
          available: BigNumber(totalAvailable),
          pending: BigNumber(totalPending),
          accountId: firstToken.accountId,
          address: firstToken.address,
          blockchainName: firstToken.blockchainName,
        };

        return createToken(aggregatedToken, metadata);
      })
      .filter((token): token is Token => token !== undefined);
  },
);

/**
 * Selector to get fungible tokens for a specific account, aggregated across all addresses.
 * This ensures that if an account has multiple addresses with the same token,
 * the balances are combined into a single token entry.
 * Derived from selectTokensGroupedByAccount for efficiency.
 */
const selectAggregatedFungibleTokensByAccountId = markParameterizedSelector(
  createSelector(
    selectTokensGroupedByAccount,
    (_: unknown, accountId: string) => accountId,
    (grouped, accountId) => grouped[accountId]?.fungible ?? [],
  ),
);

/**
 * Selector to get NFTs for a specific account, aggregated across all addresses.
 * Derived from selectTokensGroupedByAccount for efficiency.
 */
const selectAggregatedNftsByAccountId = markParameterizedSelector(
  createSelector(
    selectTokensGroupedByAccount,
    (_: unknown, accountId: string) => accountId,
    (grouped, accountId) => grouped[accountId]?.nfts ?? [],
  ),
);

/**
 * Selector to get ALL tokens (fungible + NFTs) for a specific account, aggregated across all addresses.
 * Derived from selectTokensGroupedByAccount for efficiency.
 */
const selectAggregatedTokensByAccountId = markParameterizedSelector(
  createSelector(
    selectTokensGroupedByAccount,
    (_: unknown, accountId: string) => accountId,
    (grouped, accountId) => {
      const accountData = grouped[accountId];
      if (!accountData) return [];
      return [...accountData.fungible, ...accountData.nfts];
    },
  ),
);

/**
 * Selector to get NFTs grouped into folders for a specific account.
 * Returns { folders: [], nonFolderTokens: [] } filtered by accountId.
 * Only includes folders that belong to the specified account.
 */
const selectNFTsGroupedInFoldersByAccountId = markParameterizedSelector(
  createSelector(
    selectTokensGroupedByAccount,
    (_: unknown, accountId: string) => accountId,
    tokenFolderSelectors.selectAllFolders,
    tokenFolderSelectors.selectTokenIdsByFolderId,
    // eslint-disable-next-line max-params
    (grouped, accountId, allFolders, tokenIdsByFolderId) => {
      const accountNfts = grouped[accountId]?.nfts ?? [];
      // Filter folders to only include those belonging to this account
      const accountFolders = allFolders.filter(
        folder => folder.accountId === accountId,
      );
      return groupTokensIntoFolders(
        accountNfts,
        accountFolders,
        tokenIdsByFolderId,
      );
    },
  ),
);

/**
 * Intermediate selector combining inputs for token distribution with visible accounts.
 */
const selectTokenDistributionInputs = createSelector(
  [
    rawTokensSelectors.selectAllMap,
    (_: unknown, tokenId: string) => tokenId,
    (state: { wallets?: { entities?: WalletEntitiesMap } }) =>
      state.wallets?.entities ?? EMPTY_WALLET_ENTITIES,
  ],
  (rawTokensMap, tokenId, walletsEntities) => ({
    rawTokensMap,
    tokenId,
    walletsEntities,
  }),
);

/**
 * Selector to get token distribution filtered to only visible accounts
 * (based on current network type and selected testnet).
 */
const selectTokenDistributionByTokenIdForVisibleAccounts = createSelector(
  [selectTokenDistributionInputs, selectVisibleAccountIds],
  ({ rawTokensMap, tokenId, walletsEntities }, visibleAccountIds) => {
    if (!tokenId) return [];

    const visibleSet = new Set(visibleAccountIds);

    const findAccountMetadata = (accountId: string): AnyAccount | undefined =>
      Object.values(walletsEntities)
        .reduce<AnyAccount[]>(
          (accounts, wallet) => [...accounts, ...wallet.accounts],
          [],
        )
        .find(accumulator => accumulator.accountId === accountId);

    const calculateAccountBalance = (
      accountTokensMap: AccountTokensMap,
    ): number => {
      const tokens = Object.values(accountTokensMap)
        .filter(
          (
            addressTokens,
          ): addressTokens is Partial<Record<TokenId, RawToken>> =>
            addressTokens !== undefined,
        )
        .map(addressTokens => addressTokens[TokenId(tokenId)])
        .filter((token): token is RawToken => token !== undefined);

      const totalAvailable = BigIntMath.sum(
        tokens.map(token => BigInt(token.available)),
      );

      return Number(totalAvailable);
    };

    return Object.entries(rawTokensMap)
      .filter(
        (entry): entry is [string, AccountTokensMap] =>
          entry[1] !== undefined && visibleSet.has(AccountId(entry[0])),
      )
      .map(([accountId, accountTokensMap]) => ({
        accountId,
        balance: calculateAccountBalance(accountTokensMap),
        metadata: findAccountMetadata(accountId),
      }))
      .filter(({ balance }) => balance > 0)
      .map(({ accountId, balance, metadata }) => {
        const walletId = metadata?.walletId || '';
        const wallet = walletId ? walletsEntities[walletId] : undefined;

        return {
          accountId,
          accountName: metadata?.metadata?.name,
          walletId,
          walletName: wallet?.metadata?.name,
          blockchainName: metadata?.blockchainName || 'Cardano',
          balance,
        };
      });
  },
);

/**
 * Selector to get token distribution with totals, filtered to only visible accounts
 * (based on current network type and selected testnet).
 */
const selectTokenDistributionWithTotalsForVisibleAccounts = createSelector(
  [
    selectTokensAndMetadata,
    (state: { wallets?: { entities?: WalletEntitiesMap } }) =>
      state.wallets?.entities ?? EMPTY_WALLET_ENTITIES,
    selectVisibleAccountIds,
  ],
  (
    { rawTokensMap, tokensMetadata, tokenId },
    walletsEntities,
    visibleAccountIds,
  ): TokenDistributionWithTotals => {
    if (!tokenId) {
      return { distribution: [], totals: undefined };
    }

    const visibleSet = new Set(visibleAccountIds);

    // Filter rawTokensMap to only include visible accounts
    const filteredRawTokensMap = Object.fromEntries(
      Object.entries(rawTokensMap).filter(([accountId]) =>
        visibleSet.has(AccountId(accountId)),
      ),
    );

    return computeTokenDistributionWithTotals({
      rawTokensMap: filteredRawTokensMap,
      tokensMetadata,
      tokenId,
      walletsEntities,
    });
  },
);
/*
 * Selector to get NFTs grouped into folders for all visible accounts
 */
const selectNFTsGroupedInFoldersForVisibleAccounts = createSelector(
  selectTokensGroupedByAccount,
  selectVisibleAccountIds,
  tokenFolderSelectors.selectAllFolders,
  tokenFolderSelectors.selectTokenIdsByFolderId,
  // eslint-disable-next-line max-params
  (grouped, visibleAccountIds, allFolders, tokenIdsByFolderId) => {
    const visibleSet = new Set(visibleAccountIds);

    // Collect NFTs from all visible accounts
    const visibleNfts = Object.entries(grouped)
      .filter(([accountId]) => visibleSet.has(AccountId(accountId)))
      .flatMap(([, accountData]) => accountData.nfts ?? []);

    // Filter folders to only include those belonging to visible accounts
    const visibleFolders = allFolders.filter(folder =>
      visibleSet.has(AccountId(folder.accountId)),
    );

    return groupTokensIntoFolders(
      visibleNfts,
      visibleFolders,
      tokenIdsByFolderId,
    );
  },
);

const tokensActions = {
  tokens: {
    ...rawTokensActions,
    ...tokensMetadataActions,
  },
  tokenFolders: tokenFolderActions,
  createTokenFolderFlow: createTokenFolderFlowActions,
  editTokenFolderFlow: editTokenFolderFlowActions,
};

const tokensSelectors = {
  tokens: {
    /** Master selector for per-account tokens (returns { fungible, nfts }) */
    selectTokensGroupedByAccount,
    /** All tokens (fungible + NFTs) for a specific account */
    selectAggregatedTokensByAccountId,
    /** Fungible tokens for a specific account */
    selectAggregatedFungibleTokensByAccountId,
    /** NFTs for a specific account */
    selectAggregatedNftsByAccountId,
    /** All fungible tokens globally aggregated */
    selectAggregatedFungibleTokens,
    /** All fungible tokens aggregated across currently visible accounts */
    selectAggregatedFungibleTokensForVisibleAccounts,
    /** Visible account ids based on network type + selected testnets */
    selectVisibleAccountIds,

    // === Global token lists ===
    selectAllTokens,
    selectNonFungibleTokens,
    selectFungibleTokens,
    selectAllTokensSorted: createSelector(selectAllTokens, tokens =>
      tokens.toSorted(sortTokensByTicker),
    ),
    selectTokenById,

    // === NFT folder selectors ===
    selectNFTsGroupedInFolders,
    selectNFTsGroupedInFoldersByAccountId,
    selectNFTsGroupedInFoldersForVisibleAccounts,
    selectNFTsByFolderId,
    selectFolderSelectableTokens,
    selectCreateFolderTokens,

    // === Token distribution selectors ===
    /** Token distribution filtered to visible accounts (network-aware) */
    selectTokenDistributionByTokenIdForVisibleAccounts,
    /** Token distribution with totals filtered to visible accounts (network-aware) */
    selectTokenDistributionWithTotalsForVisibleAccounts,

    // === Raw data access ===
    selectAllRaw: rawTokensSelectors.selectAll,
    selectAllRawMap: rawTokensSelectors.selectAllMap,
    selectTokensCount: rawTokensSelectors.selectUniqueTokensCount,
    selectHasFunds: rawTokensSelectors.selectHasFunds,
    selectTokensMetadata: tokensMetadataSelectors.selectTokensMetadata,
  },
  tokenFolders: tokenFolderSelectors,
  createTokenFolderFlow: createTokenFolderFlowSelectors,
  editTokenFolderFlow: editTokenFolderFlowSelectors,
};

const reducers = {
  ...rawTokensReducers,
  ...tokensMetadataReducers,
  ...tokenFolderReducers,
  ...createTokenFolderFlowReducers,
  ...editTokenFolderFlowReducers,
};

export type * from './rawTokensSlice';
export type * from './tokensMetadataSlice';
export type { GroupedTokens } from './group-tokens-into-folders';
export type TokensStoreState = StateFromReducersMapObject<typeof reducers>;
export { tokensActions, tokensSelectors, reducers };
