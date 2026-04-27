import { BlockchainNetworkId } from '@lace-contract/network';
import { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
import { BigNumber } from '@lace-sdk/util';
import { describe, expect, it } from 'vitest';

import { FolderId, TokenId } from '../../src';
import { tokensSelectors } from '../../src/store/slice/slice';

import type { RawTokensState } from '../../src/store/slice/rawTokensSlice';
import type { TokenIdsByFolderId } from '../../src/store/slice/tokenFolderSlice';
import type { TokensMetadataState } from '../../src/store/slice/tokensMetadataSlice';
import type { Folder } from '../../src/store/types';
import type { Address } from '@lace-contract/addresses';
import type { State } from '@lace-contract/module';
import type { WalletEntity } from '@lace-contract/wallet-repo';

type TestAccount = {
  accountId: AccountId;
  walletId: string;
  blockchainName: 'Bitcoin' | 'Cardano';
  networkType: 'mainnet' | 'testnet';
  blockchainNetworkId: string;
};

type NftData = {
  tokenId: TokenId;
  accountId: AccountId;
  address: Address;
};

const createWallet = (
  walletId: string,
  accounts: TestAccount[],
): WalletEntity =>
  ({
    walletId: WalletId(walletId),
    metadata: { name: `Wallet ${walletId}`, order: 0 },
    type: WalletType.InMemory,
    accounts: accounts.map(account => ({
      accountId: account.accountId,
      walletId: WalletId(account.walletId),
      accountType: 'InMemory',
      blockchainName: account.blockchainName,
      networkType: account.networkType,
      blockchainNetworkId: account.blockchainNetworkId,
      metadata: { name: `${account.blockchainName} Account` },
      blockchainSpecific: {},
    })),
  } as WalletEntity);

const createNftRawTokensState = (nfts: NftData[]): RawTokensState => {
  const state: RawTokensState = {};
  for (const nft of nfts) {
    if (!state[nft.accountId]) {
      state[nft.accountId] = {};
    }
    if (!state[nft.accountId]![nft.address]) {
      state[nft.accountId]![nft.address] = {};
    }
    state[nft.accountId]![nft.address]![nft.tokenId] = {
      tokenId: nft.tokenId,
      available: BigNumber(1n),
      pending: BigNumber(0n),
      accountId: nft.accountId,
      address: nft.address,
      blockchainName: 'Cardano',
    };
  }
  return state;
};

const createNftMetadata = (tokenIds: TokenId[]): TokensMetadataState => ({
  byTokenId: Object.fromEntries(
    tokenIds.map(tokenId => [
      tokenId,
      {
        tokenId,
        isNft: true,
        decimals: 0,
        blockchainSpecific: {},
      },
    ]),
  ),
});

const createState = ({
  rawTokensState = {},
  tokensMetadataState = { byTokenId: {} },
  walletsEntities = {},
  folders = [],
  tokenIdsByFolderId = {},
  networkType,
  blockchainNetworks,
}: {
  rawTokensState?: RawTokensState;
  tokensMetadataState?: TokensMetadataState;
  walletsEntities?: Record<string, WalletEntity>;
  folders?: Folder[];
  tokenIdsByFolderId?: TokenIdsByFolderId;
  networkType?: 'mainnet' | 'testnet';
  blockchainNetworks?: Partial<
    Record<'Bitcoin' | 'Cardano', { mainnet: string; testnet: string }>
  >;
}): State =>
  ({
    rawTokens: rawTokensState,
    tokensMetadata: tokensMetadataState,
    wallets: { ids: Object.keys(walletsEntities), entities: walletsEntities },
    tokenFolders: {
      folders,
      tokenIdsByFolderId,
    },
    network: {
      ...(networkType ? { networkType } : {}),
      blockchainNetworks: blockchainNetworks ?? {},
    },
  } as unknown as State);

describe('selectNFTsGroupedInFoldersForVisibleAccounts', () => {
  const cardanoPreprod = BlockchainNetworkId('cardano-preprod');
  const cardanoPreview = BlockchainNetworkId('cardano-preview');
  const cardanoMainnet = BlockchainNetworkId('cardano-mainnet');

  const preprodAccount = AccountId('preprod-account');
  const previewAccount = AccountId('preview-account');
  const mainnetAccount = AccountId('mainnet-account');

  const preprodAddress = 'preprod-addr' as Address;
  const previewAddress = 'preview-addr' as Address;
  const mainnetAddress = 'mainnet-addr' as Address;

  const nft1 = TokenId('nft-1');
  const nft2 = TokenId('nft-2');
  const nft3 = TokenId('nft-3');

  const walletsEntities = {
    w1: createWallet('w1', [
      {
        accountId: preprodAccount,
        walletId: 'w1',
        blockchainName: 'Cardano',
        networkType: 'testnet',
        blockchainNetworkId: cardanoPreprod,
      },
      {
        accountId: previewAccount,
        walletId: 'w1',
        blockchainName: 'Cardano',
        networkType: 'testnet',
        blockchainNetworkId: cardanoPreview,
      },
      {
        accountId: mainnetAccount,
        walletId: 'w1',
        blockchainName: 'Cardano',
        networkType: 'mainnet',
        blockchainNetworkId: cardanoMainnet,
      },
    ]),
  };

  it('returns empty result when network type is undefined', () => {
    const rawTokensState = createNftRawTokensState([
      { tokenId: nft1, accountId: preprodAccount, address: preprodAddress },
    ]);
    const tokensMetadataState = createNftMetadata([nft1]);

    const state = createState({
      rawTokensState,
      tokensMetadataState,
      walletsEntities,
      blockchainNetworks: {
        Cardano: { mainnet: cardanoMainnet, testnet: cardanoPreprod },
      },
    });

    const result =
      tokensSelectors.tokens.selectNFTsGroupedInFoldersForVisibleAccounts(
        state,
      );

    expect(result.nonFolderTokens).toHaveLength(0);
    expect(result.folders).toHaveLength(0);
  });

  it('filters NFTs by network id (mainnet)', () => {
    const rawTokensState = createNftRawTokensState([
      { tokenId: nft1, accountId: preprodAccount, address: preprodAddress },
      { tokenId: nft2, accountId: mainnetAccount, address: mainnetAddress },
    ]);
    const tokensMetadataState = createNftMetadata([nft1, nft2]);

    const state = createState({
      rawTokensState,
      tokensMetadataState,
      walletsEntities,
      networkType: 'mainnet',
      blockchainNetworks: {
        Cardano: { mainnet: cardanoMainnet, testnet: cardanoPreprod },
      },
    });

    const result =
      tokensSelectors.tokens.selectNFTsGroupedInFoldersForVisibleAccounts(
        state,
      );

    expect(result.nonFolderTokens).toHaveLength(1);
    expect(result.nonFolderTokens[0].tokenId).toBe(nft2);
  });

  it('filters NFTs by selected testnet network', () => {
    const rawTokensState = createNftRawTokensState([
      { tokenId: nft1, accountId: preprodAccount, address: preprodAddress },
      { tokenId: nft2, accountId: previewAccount, address: previewAddress },
      { tokenId: nft3, accountId: mainnetAccount, address: mainnetAddress },
    ]);
    const tokensMetadataState = createNftMetadata([nft1, nft2, nft3]);

    const state = createState({
      rawTokensState,
      tokensMetadataState,
      walletsEntities,
      networkType: 'testnet',
      blockchainNetworks: {
        Cardano: { mainnet: cardanoMainnet, testnet: cardanoPreprod },
      },
    });

    const result =
      tokensSelectors.tokens.selectNFTsGroupedInFoldersForVisibleAccounts(
        state,
      );

    expect(result.nonFolderTokens).toHaveLength(1);
    expect(result.nonFolderTokens[0].tokenId).toBe(nft1);
  });

  it('filters folders by visible accounts', () => {
    const rawTokensState = createNftRawTokensState([
      { tokenId: nft1, accountId: preprodAccount, address: preprodAddress },
      { tokenId: nft2, accountId: previewAccount, address: previewAddress },
    ]);
    const tokensMetadataState = createNftMetadata([nft1, nft2]);

    const preprodFolder: Folder = {
      id: FolderId('folder-preprod'),
      name: 'Preprod Folder',
      accountId: preprodAccount,
    };
    const previewFolder: Folder = {
      id: FolderId('folder-preview'),
      name: 'Preview Folder',
      accountId: previewAccount,
    };

    const state = createState({
      rawTokensState,
      tokensMetadataState,
      walletsEntities,
      folders: [preprodFolder, previewFolder],
      tokenIdsByFolderId: {
        [FolderId('folder-preprod')]: [nft1],
        [FolderId('folder-preview')]: [nft2],
      },
      networkType: 'testnet',
      blockchainNetworks: {
        Cardano: { mainnet: cardanoMainnet, testnet: cardanoPreprod },
      },
    });

    const result =
      tokensSelectors.tokens.selectNFTsGroupedInFoldersForVisibleAccounts(
        state,
      );

    expect(result.folders).toHaveLength(1);
    expect(result.folders[0].id).toBe(FolderId('folder-preprod'));
    expect(result.folders[0].tokens).toHaveLength(1);
    expect(result.folders[0].tokens[0].tokenId).toBe(nft1);
    expect(result.nonFolderTokens).toHaveLength(0);
  });

  it('correctly groups NFTs into folders for visible accounts', () => {
    const rawTokensState = createNftRawTokensState([
      { tokenId: nft1, accountId: preprodAccount, address: preprodAddress },
      { tokenId: nft2, accountId: preprodAccount, address: preprodAddress },
      { tokenId: nft3, accountId: preprodAccount, address: preprodAddress },
    ]);
    const tokensMetadataState = createNftMetadata([nft1, nft2, nft3]);

    const folder: Folder = {
      id: FolderId('my-folder'),
      name: 'My Folder',
      accountId: preprodAccount,
    };

    const state = createState({
      rawTokensState,
      tokensMetadataState,
      walletsEntities,
      folders: [folder],
      tokenIdsByFolderId: {
        [FolderId('my-folder')]: [nft1, nft2],
      },
      networkType: 'testnet',
      blockchainNetworks: {
        Cardano: { mainnet: cardanoMainnet, testnet: cardanoPreprod },
      },
    });

    const result =
      tokensSelectors.tokens.selectNFTsGroupedInFoldersForVisibleAccounts(
        state,
      );

    expect(result.folders).toHaveLength(1);
    expect(result.folders[0].tokens).toHaveLength(2);
    expect(result.folders[0].tokens.map(t => t.tokenId)).toContain(nft1);
    expect(result.folders[0].tokens.map(t => t.tokenId)).toContain(nft2);
    expect(result.nonFolderTokens).toHaveLength(1);
    expect(result.nonFolderTokens[0].tokenId).toBe(nft3);
  });

  it('aggregates NFTs from multiple visible accounts', () => {
    // Create two accounts on the same testnet network
    const account1 = AccountId('preprod-account-1');
    const account2 = AccountId('preprod-account-2');
    const address1 = 'addr-1' as Address;
    const address2 = 'addr-2' as Address;

    const multiAccountWallets = {
      w1: createWallet('w1', [
        {
          accountId: account1,
          walletId: 'w1',
          blockchainName: 'Cardano',
          networkType: 'testnet',
          blockchainNetworkId: cardanoPreprod,
        },
        {
          accountId: account2,
          walletId: 'w1',
          blockchainName: 'Cardano',
          networkType: 'testnet',
          blockchainNetworkId: cardanoPreprod,
        },
      ]),
    };

    const rawTokensState = createNftRawTokensState([
      { tokenId: nft1, accountId: account1, address: address1 },
      { tokenId: nft2, accountId: account2, address: address2 },
    ]);
    const tokensMetadataState = createNftMetadata([nft1, nft2]);

    const state = createState({
      rawTokensState,
      tokensMetadataState,
      walletsEntities: multiAccountWallets,
      networkType: 'testnet',
      blockchainNetworks: {
        Cardano: { mainnet: cardanoMainnet, testnet: cardanoPreprod },
      },
    });

    const result =
      tokensSelectors.tokens.selectNFTsGroupedInFoldersForVisibleAccounts(
        state,
      );

    expect(result.nonFolderTokens).toHaveLength(2);
    expect(result.nonFolderTokens.map(t => t.tokenId)).toContain(nft1);
    expect(result.nonFolderTokens.map(t => t.tokenId)).toContain(nft2);
  });

  it('aggregates folders from multiple visible accounts', () => {
    const account1 = AccountId('preprod-account-1');
    const account2 = AccountId('preprod-account-2');
    const address1 = 'addr-1' as Address;
    const address2 = 'addr-2' as Address;

    const multiAccountWallets = {
      w1: createWallet('w1', [
        {
          accountId: account1,
          walletId: 'w1',
          blockchainName: 'Cardano',
          networkType: 'testnet',
          blockchainNetworkId: cardanoPreprod,
        },
        {
          accountId: account2,
          walletId: 'w1',
          blockchainName: 'Cardano',
          networkType: 'testnet',
          blockchainNetworkId: cardanoPreprod,
        },
      ]),
    };

    const rawTokensState = createNftRawTokensState([
      { tokenId: nft1, accountId: account1, address: address1 },
      { tokenId: nft2, accountId: account2, address: address2 },
    ]);
    const tokensMetadataState = createNftMetadata([nft1, nft2]);

    const folder1: Folder = {
      id: FolderId('folder-1'),
      name: 'Folder 1',
      accountId: account1,
    };
    const folder2: Folder = {
      id: FolderId('folder-2'),
      name: 'Folder 2',
      accountId: account2,
    };

    const state = createState({
      rawTokensState,
      tokensMetadataState,
      walletsEntities: multiAccountWallets,
      folders: [folder1, folder2],
      tokenIdsByFolderId: {
        [FolderId('folder-1')]: [nft1],
        [FolderId('folder-2')]: [nft2],
      },
      networkType: 'testnet',
      blockchainNetworks: {
        Cardano: { mainnet: cardanoMainnet, testnet: cardanoPreprod },
      },
    });

    const result =
      tokensSelectors.tokens.selectNFTsGroupedInFoldersForVisibleAccounts(
        state,
      );

    expect(result.folders).toHaveLength(2);
    expect(result.folders.map(f => f.id)).toContain(FolderId('folder-1'));
    expect(result.folders.map(f => f.id)).toContain(FolderId('folder-2'));
    expect(result.nonFolderTokens).toHaveLength(0);
  });

  it('excludes folders from non-visible accounts even if they reference visible NFTs', () => {
    const rawTokensState = createNftRawTokensState([
      { tokenId: nft1, accountId: preprodAccount, address: preprodAddress },
    ]);
    const tokensMetadataState = createNftMetadata([nft1]);

    // Folder belongs to preview account (not visible when preprod is selected)
    const previewFolder: Folder = {
      id: FolderId('folder-preview'),
      name: 'Preview Folder',
      accountId: previewAccount,
    };

    const state = createState({
      rawTokensState,
      tokensMetadataState,
      walletsEntities,
      folders: [previewFolder],
      tokenIdsByFolderId: {
        [FolderId('folder-preview')]: [nft1],
      },
      networkType: 'testnet',
      blockchainNetworks: {
        Cardano: { mainnet: cardanoMainnet, testnet: cardanoPreprod },
      },
    });

    const result =
      tokensSelectors.tokens.selectNFTsGroupedInFoldersForVisibleAccounts(
        state,
      );

    // Folder should be excluded because it belongs to preview account
    expect(result.folders).toHaveLength(0);
    // NFT should appear as non-folder token since its folder is not visible
    expect(result.nonFolderTokens).toHaveLength(1);
    expect(result.nonFolderTokens[0].tokenId).toBe(nft1);
  });

  it('returns empty result when no NFTs exist', () => {
    const state = createState({
      rawTokensState: {},
      tokensMetadataState: { byTokenId: {} },
      walletsEntities,
      networkType: 'testnet',
      blockchainNetworks: {
        Cardano: { mainnet: cardanoMainnet, testnet: cardanoPreprod },
      },
    });

    const result =
      tokensSelectors.tokens.selectNFTsGroupedInFoldersForVisibleAccounts(
        state,
      );

    expect(result.nonFolderTokens).toHaveLength(0);
    expect(result.folders).toHaveLength(0);
  });

  it('returns empty folders array when no folders exist but NFTs do', () => {
    const rawTokensState = createNftRawTokensState([
      { tokenId: nft1, accountId: preprodAccount, address: preprodAddress },
    ]);
    const tokensMetadataState = createNftMetadata([nft1]);

    const state = createState({
      rawTokensState,
      tokensMetadataState,
      walletsEntities,
      folders: [],
      tokenIdsByFolderId: {},
      networkType: 'testnet',
      blockchainNetworks: {
        Cardano: { mainnet: cardanoMainnet, testnet: cardanoPreprod },
      },
    });

    const result =
      tokensSelectors.tokens.selectNFTsGroupedInFoldersForVisibleAccounts(
        state,
      );

    expect(result.folders).toHaveLength(0);
    expect(result.nonFolderTokens).toHaveLength(1);
  });
});
