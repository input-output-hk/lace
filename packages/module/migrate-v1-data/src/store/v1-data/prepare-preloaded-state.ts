import { Cardano } from '@cardano-sdk/core';
import { KeyPurpose } from '@cardano-sdk/key-management';
import { isNotNil } from '@cardano-sdk/util';
import { WalletType as V1WalletType } from '@cardano-sdk/web-extension';
import { ContactId } from '@lace-contract/address-book';
import { AddressAlias, AddressAliasType } from '@lace-contract/addresses';
import {
  BitcoinAccountId,
  BitcoinNetwork,
  BitcoinNetworkId,
} from '@lace-contract/bitcoin-context';
import {
  CardanoAccountId,
  CardanoAddress,
  CardanoNetworkId,
} from '@lace-contract/cardano-context';
import {
  DappId,
  type AuthorizedDapp,
  type DappConnectorStoreState,
} from '@lace-contract/dapp-connector';
import { FolderId, TokenId } from '@lace-contract/tokens';
import { WalletType, WalletId } from '@lace-contract/wallet-repo';
import { HexBytes, Timestamp } from '@lace-sdk/util';
import omit from 'lodash/omit';
import uniqBy from 'lodash/uniqBy';

import {
  deleteLmpWalletsAndAuthorizedDapps as deleteLmpStateToBeOverwritten,
  getExtensionStorageData,
} from './extension-storage';
import { getIndexedbData } from './indexeddb';

// load State type augmentations
import '@lace-contract/wallet-repo';
import '@lace-contract/dapp-connector';
import '@lace-contract/tokens';
import '@lace-contract/address-book';

import type {
  V1AccountMetadata,
  V1Wallet,
  V1WalletMetadata,
} from './extension-storage';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { Bip32WalletAccount as V1Bip32WalletAccount } from '@cardano-sdk/web-extension';
import type { AddressBookStoreState } from '@lace-contract/address-book';
import type { AnalyticsStoreState } from '@lace-contract/analytics';
import type { BitcoinBip32AccountProps } from '@lace-contract/bitcoin-context';
import type {
  CardanoBip32AccountProps,
  CardanoSpecificInMemoryWalletData,
} from '@lace-contract/cardano-context';
import type { State } from '@lace-contract/module';
import type {
  BlockchainNetworkId,
  NetworkStoreState,
  NetworkType,
} from '@lace-contract/network';
import type { TokensStoreState } from '@lace-contract/tokens';
import type {
  AccountId,
  AnyWallet,
  HardwareWalletAccount,
  InMemoryWalletAccount,
  WalletMetadata,
  WalletsState,
} from '@lace-contract/wallet-repo';
import type { BlockchainName } from '@lace-lib/util-store';

const mapCommonWalletMetadata = (
  metadata: V1WalletMetadata,
): WalletMetadata => ({
  name: metadata.name,
  order: 100,
});

type BlockchainAccountProps = {
  accountId: AccountId;
  blockchainSpecific: unknown;
  blockchainNetworkId: BlockchainNetworkId;
};

const mapCardanoAccountProps = ({
  walletId,
  accountIndex,
  extendedAccountPublicKey,
  networkType,
}: {
  walletId: WalletId;
  accountIndex: number;
  extendedAccountPublicKey: Bip32PublicKeyHex;
  networkType: NetworkType;
}): BlockchainAccountProps[] => {
  const networkMagics =
    networkType === 'mainnet'
      ? [Cardano.NetworkMagics.Mainnet]
      : [Cardano.NetworkMagics.Preprod, Cardano.NetworkMagics.Preview];
  return networkMagics.map(networkMagic => ({
    accountId: CardanoAccountId(walletId, accountIndex, networkMagic),
    blockchainSpecific: {
      accountIndex,
      chainId:
        networkType === 'mainnet'
          ? Cardano.ChainIds.Mainnet
          : Cardano.ChainIds.Preprod,
      extendedAccountPublicKey,
    } satisfies CardanoBip32AccountProps,
    blockchainNetworkId: CardanoNetworkId(networkMagic),
  }));
};

const mapBitcoinAccountProps = ({
  walletId,
  accountIndex,
  metadata,
  networkType,
}: {
  walletId: WalletId;
  accountIndex: number;
  metadata: V1AccountMetadata;
  networkType: NetworkType;
}): BlockchainAccountProps[] => {
  const bitcoinNetwork =
    networkType === 'mainnet' ? BitcoinNetwork.Mainnet : BitcoinNetwork.Testnet;
  return [
    {
      accountId: BitcoinAccountId(walletId, accountIndex, bitcoinNetwork),
      blockchainSpecific: {
        accountIndex,
        extendedAccountPublicKeys:
          metadata.bitcoin!.extendedAccountPublicKeys[networkType],
      } satisfies BitcoinBip32AccountProps,
      blockchainNetworkId: BitcoinNetworkId(bitcoinNetwork),
    },
  ];
};

type Bip32Account = HardwareWalletAccount | InMemoryWalletAccount;

function mapBip32Account(
  accountType: 'HardwareLedger' | 'HardwareTrezor',
  walletId: WalletId,
  blockchainName: BlockchainName,
): (
  account: V1Bip32WalletAccount<V1AccountMetadata>,
) => HardwareWalletAccount[];
function mapBip32Account(
  accountType: 'InMemory',
  walletId: WalletId,
  blockchainName: BlockchainName,
): (
  account: V1Bip32WalletAccount<V1AccountMetadata>,
) => InMemoryWalletAccount[];
function mapBip32Account(
  accountType: 'HardwareLedger' | 'HardwareTrezor' | 'InMemory',
  walletId: WalletId,
  blockchainName: BlockchainName,
) {
  return ({
    accountIndex,
    extendedAccountPublicKey,
    metadata,
    purpose,
  }: V1Bip32WalletAccount<V1AccountMetadata>): Bip32Account[] =>
    purpose === KeyPurpose.MULTI_SIG
      ? // no need to migrate shared wallet signer accounts as it's a beta feature (testnet-only) and we are likely to change how they work in the next iteration of the feature
        []
      : (['mainnet', 'testnet'] as const).flatMap(
          (networkType): Bip32Account[] =>
            (blockchainName === 'Cardano'
              ? mapCardanoAccountProps({
                  walletId,
                  accountIndex,
                  extendedAccountPublicKey,
                  networkType,
                })
              : mapBitcoinAccountProps({
                  walletId,
                  accountIndex,
                  metadata,
                  networkType,
                })
            ).map(blockchainAccountProps => ({
              walletId,
              blockchainName,
              accountType,
              metadata: { name: metadata.name },
              networkType,
              ...blockchainAccountProps,
            })),
        );
}

const mapWallet = (v1Wallet: V1Wallet): AnyWallet | null => {
  const walletId = WalletId(v1Wallet.walletId);
  const blockchainName: BlockchainName =
    (v1Wallet.type !== V1WalletType.Script && v1Wallet.blockchainName) ||
    'Cardano';
  const commonWalletMetadata = mapCommonWalletMetadata(v1Wallet.metadata);
  switch (v1Wallet.type) {
    case V1WalletType.Ledger:
      return {
        type: WalletType.HardwareLedger,
        metadata: commonWalletMetadata,
        walletId,
        blockchainSpecific: {},
        accounts: v1Wallet.accounts.flatMap(
          mapBip32Account(WalletType.HardwareLedger, walletId, blockchainName),
        ),
      };
    case V1WalletType.Trezor:
      return {
        type: WalletType.HardwareTrezor,
        metadata: {
          ...commonWalletMetadata,
          derivationType: v1Wallet.metadata.trezorConfig?.derivationType,
        },
        walletId,
        blockchainSpecific: {},
        accounts: v1Wallet.accounts.flatMap(
          mapBip32Account(WalletType.HardwareTrezor, walletId, blockchainName),
        ),
      };
    case V1WalletType.InMemory:
      return {
        type: WalletType.InMemory,
        encryptedRecoveryPhrase: HexBytes(
          // TODO: verify that in v2 we encrypt in the same way and the same data format as in v1
          v1Wallet.encryptedSecrets.keyMaterial,
        ),
        isPassphraseConfirmed: true,
        metadata: commonWalletMetadata,
        walletId,
        blockchainSpecific: {
          // same blockchain-specific wallet data for Bitcoin and Cardano
          [blockchainName]: {
            encryptedRootPrivateKey: HexBytes(
              v1Wallet.encryptedSecrets.rootPrivateKeyBytes,
            ),
          } satisfies CardanoSpecificInMemoryWalletData,
        },
        accounts: v1Wallet.accounts.flatMap(
          mapBip32Account(WalletType.InMemory, walletId, blockchainName),
        ),
      };
    case V1WalletType.Script:
    default:
      // no need to migrate shared wallets as it's a beta feature (testnet-only) and we are likely to change how they work in the next iteration of the feature
      return null;
  }
};

export const preparePreloadedState = async (): Promise<{
  state: Partial<State>;
}> => {
  const {
    lmpMidnightAuthorizedDapps,
    lmpMidnightWallets,
    v1ActiveWallet,
    v1AuthorizedDapps,
    v1UserId,
    v1Wallets,
  } = await getExtensionStorageData();
  const { v1AddressBookEntries, v1NftFolderEntries } = await getIndexedbData();

  const combinedWallets: AnyWallet[] = uniqBy(
    [...lmpMidnightWallets, ...v1Wallets.map(mapWallet).filter(isNotNil)],
    wallet => wallet.walletId,
  );
  const inMemoryWalletIds = combinedWallets
    .filter(w => w.type === WalletType.InMemory)
    .map(w => w.walletId);

  /** Any migrated wallet (hardware-only, single mnemonic, or several) needs a global app password in v2. */
  const isApplicationPasswordMigrationNeeded = combinedWallets.length > 0;

  const wallets: WalletsState = {
    wallets: {
      activeAccountContext: null,
      isWalletRepoMigrating: inMemoryWalletIds.length >= 2,
      ids: combinedWallets.map(w => w.walletId),
      entities: combinedWallets.reduce((result, wallet) => {
        result[wallet.walletId] = wallet;
        return result;
      }, {} as WalletsState['wallets']['entities']),
    },
  };

  const authorizedDapps: Pick<DappConnectorStoreState, 'authorizedDapps'> = {
    authorizedDapps: {
      Cardano: v1AuthorizedDapps.map(
        (v1dapp): AuthorizedDapp => ({
          blockchain: 'Cardano',
          dapp: {
            id: DappId(v1dapp.url),
            imageUrl: v1dapp.logo,
            name: v1dapp.name,
            origin: v1dapp.url,
          },
          isPersisted: true,
        }),
      ),
      Midnight: lmpMidnightAuthorizedDapps,
    },
  };

  const networkType: Partial<NetworkStoreState> = v1ActiveWallet?.chainId
    ? {
        network: {
          networkType:
            v1ActiveWallet.chainId.networkId === Cardano.NetworkId.Mainnet
              ? 'mainnet'
              : 'testnet',
          initialNetworkType:
            v1ActiveWallet.chainId.networkId === Cardano.NetworkId.Mainnet
              ? 'mainnet'
              : 'testnet',
          blockchainNetworks:
            // set default testnet if v1's currently active account is a testnet
            v1ActiveWallet.chainId.networkId === Cardano.NetworkId.Testnet
              ? {
                  Cardano: {
                    mainnet: CardanoNetworkId(Cardano.NetworkMagics.Mainnet),
                    testnet: CardanoNetworkId(
                      v1ActiveWallet.chainId.networkMagic,
                    ),
                  },
                }
              : {},
          testnetOptions: {},
        },
      }
    : {};

  const analytics: Partial<AnalyticsStoreState> = v1UserId
    ? { analytics: { analytics: { user: { id: v1UserId } } } }
    : {};

  const allAccountIds = combinedWallets.flatMap(w =>
    w.accounts.map(account => account.accountId),
  );
  const allAccountFolders = v1NftFolderEntries.flatMap(v1Folder =>
    // in v1, folders are app-wide (not account-specific).
    // therefore we create each folder on each account
    allAccountIds.map(accountId => ({
      id: FolderId(`${v1Folder.id}-${accountId}`),
      name: v1Folder.name,
      accountId,
      tokenIds: v1Folder.assets.map(TokenId),
    })),
  );
  const nftFolders: Partial<TokensStoreState> =
    v1NftFolderEntries.length > 0
      ? {
          tokenFolders: {
            folders: allAccountFolders.map(folder => omit(folder, 'tokenIds')),
            tokenIdsByFolderId: allAccountFolders.reduce((result, folder) => {
              result[folder.id] = folder.tokenIds;
              return result;
            }, {} as Partial<Record<FolderId, TokenId[]>>),
          },
        }
      : {};

  const addressBook: Partial<AddressBookStoreState> =
    v1AddressBookEntries.length > 0
      ? {
          addressBook: {
            contacts: v1AddressBookEntries.reduce((result, entry) => {
              const id = ContactId(entry.id.toString());
              const address = CardanoAddress(
                // if entry is handle-based, then 'entry.address' is set to the handle
                entry.handleResolution?.cardanoAddress || entry.address,
              );
              const network = CardanoNetworkId(entry.network);
              const avatar = entry.handleResolution?.image;
              result[id] = {
                id,
                addresses: [
                  {
                    address,
                    network,
                    blockchainName: 'Cardano',
                  },
                ],
                aliases: entry.handleResolution
                  ? [
                      {
                        alias: AddressAlias(entry.handleResolution.handle),
                        aliasType: AddressAliasType('ADA_HANDLE'),
                        blockchainName: 'Cardano',
                        networkId: network,
                        resolvedAddress: address,
                        // this is not available - fallback to time of migration
                        resolvedAt: Timestamp.now(),
                        image: avatar,
                      },
                    ]
                  : [],
                name: entry.name,
                avatar,
              };
              return result;
            }, {} as AddressBookStoreState['addressBook']['contacts']),
          },
        }
      : {};

  // required for 'preloadedState' to take effect. otherwise it would be overwritten by redux-storage rehydration.
  await deleteLmpStateToBeOverwritten();

  const migrateV1: Partial<State> = {
    migrateV1: {
      isMigrated: true,
      passwordMigration: isApplicationPasswordMigrationNeeded
        ? {
            status: 'pending',
            walletsPendingActivation: inMemoryWalletIds,
            initialWalletCount: inMemoryWalletIds.length,
          }
        : {
            status: 'completed',
            walletsPendingActivation: [],
            initialWalletCount: 0,
          },
    },
  };

  const state: Partial<State> = {
    ...wallets,
    ...authorizedDapps,
    ...networkType,
    ...analytics,
    ...nftFolders,
    ...addressBook,
    ...migrateV1,
  };

  return { state };
};
