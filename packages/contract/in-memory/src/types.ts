import type { ComponentType } from 'react';

import type { BlockchainNetworkId } from '@lace-contract/network';
import type {
  InMemoryWallet,
  InMemoryWalletAccount,
  WalletId,
} from '@lace-contract/wallet-repo';
import type { UICustomisation } from '@lace-lib/util-render';
import type { BlockchainName } from '@lace-lib/util-store';
import type { Logger } from 'ts-log';

export interface InitializeInMemoryWalletProps {
  walletId: WalletId;
  order: number;
  password: Uint8Array;
  recoveryPhrase: string[];
  walletName: string;
}

export type CreateInMemoryAccountProps<BlockchainSpecificWalletData = unknown> =
  {
    blockchainSpecific: BlockchainSpecificWalletData;
    accountIndex: number;
    walletId: WalletId;
    blockchainName: BlockchainName;
    password: Uint8Array;
    /** Optional account name to apply to all created accounts */
    accountName?: string;
    /** When set, create accounts only for these networks (e.g. active network in UI) */
    targetNetworks?: Set<BlockchainNetworkId>;
  };

export interface CreateInMemoryWalletDependencies {
  logger: Logger;
}

export type InitializeInMemoryWalletResult<
  BlockchainSpecificAccountData = unknown,
  BlockchainSpecificWalletData = unknown,
> = {
  accounts: InMemoryWalletAccount<BlockchainSpecificAccountData>[];
  blockchainSpecificWalletData?: BlockchainSpecificWalletData;
};

export type CreateInMemoryAccountResult<
  BlockchainSpecificAccountData = unknown,
> = InMemoryWalletAccount<BlockchainSpecificAccountData>[];

export type InitializeInMemoryWallet<
  BlockchainSpecificAccountData,
  BlockchainSpecificWalletData = unknown,
> = (
  props: InitializeInMemoryWalletProps,
  dependencies: CreateInMemoryWalletDependencies,
) => Promise<
  InitializeInMemoryWalletResult<
    BlockchainSpecificAccountData,
    BlockchainSpecificWalletData
  >
>;

export type CreateInMemoryWalletAccounts<
  BlockchainSpecificAccountData,
  BlockchainSpecificWalletData = unknown,
> = (
  props: CreateInMemoryAccountProps<BlockchainSpecificWalletData>,
  dependencies: CreateInMemoryWalletDependencies,
) => Promise<CreateInMemoryAccountResult<BlockchainSpecificAccountData>>;

/**
 * Props for adding accounts to an existing wallet.
 * Handles both cases: existing blockchain (uses blockchainSpecific) or new blockchain (decrypts recoveryPhrase).
 */
export type AddInMemoryAccountsProps = {
  wallet: InMemoryWallet;
  accountIndex: number;
  password: Uint8Array;
  /** Optional account name to apply to all created accounts */
  accountName?: string;
  /** When set, create accounts only for these networks */
  targetNetworks?: Set<BlockchainNetworkId>;
};

/**
 * Result of adding accounts to an existing wallet.
 * Returns the wallet with merged accounts and updated blockchainSpecific data.
 */
export type AddInMemoryAccountsResult<BlockchainSpecificAccountData = unknown> =
  {
    /** Updated wallet with the new accounts appended and blockchainSpecific merged */
    wallet: InMemoryWallet<BlockchainSpecificAccountData>;
  };

/**
 * Adds accounts to an existing wallet.
 * Handles both scenarios:
 * - Existing blockchain: uses wallet's blockchainSpecific data to derive the accounts
 * - New blockchain: decrypts wallet's recoveryPhrase, creates blockchain-specific data, creates accounts
 *
 * Returns a wallet with merged accounts and blockchainSpecific data.
 */
export type AddInMemoryWalletAccounts<BlockchainSpecificAccountData> = (
  props: AddInMemoryAccountsProps,
  dependencies: CreateInMemoryWalletDependencies,
) => Promise<AddInMemoryAccountsResult<BlockchainSpecificAccountData>>;

/**
 * Props for creating blockchain-specific wallet data from a recovery phrase.
 * Used when initializing a new blockchain for an existing wallet.
 */
export type CreateBlockchainSpecificWalletDataProps = {
  walletId: WalletId;
  password: Uint8Array;
  recoveryPhrase: string[];
};

/**
 * Creates blockchain-specific wallet data from a recovery phrase.
 * This is a lighter alternative to initializeWallet that only creates
 * the blockchainSpecificWalletData without creating accounts.
 */
export type CreateBlockchainSpecificWalletData<BlockchainSpecificWalletData> = (
  props: CreateBlockchainSpecificWalletDataProps,
  dependencies: CreateInMemoryWalletDependencies,
) => Promise<BlockchainSpecificWalletData>;

export type WithBlockchainName<Blockchain = BlockchainName> = {
  blockchainName: Blockchain;
};

export type InMemoryWalletIntegration<
  Blockchain extends BlockchainName = BlockchainName,
  BlockchainSpecificAccountData = unknown,
  BlockchainSpecificWalletData = unknown,
> = WithBlockchainName<Blockchain> & {
  initializeWallet: InitializeInMemoryWallet<
    BlockchainSpecificAccountData,
    BlockchainSpecificWalletData
  >;
  createAccounts: CreateInMemoryWalletAccounts<
    BlockchainSpecificAccountData,
    BlockchainSpecificWalletData
  >;
  /**
   * Adds accounts to an existing wallet.
   * Handles both existing blockchain (uses blockchainSpecific) and new blockchain (decrypts recoveryPhrase).
   * Returns a wallet with merged accounts and blockchainSpecific data.
   */
  addAccounts: AddInMemoryWalletAccounts<BlockchainSpecificAccountData>;
};

export type RestoreWalletUICustomisationProps = {
  onProvideRecoveryPhrase: (recoveryPhrase: string[]) => void;
};

export type RestoreWalletUICustomisation = UICustomisation<{
  PageFooter: ComponentType<RestoreWalletUICustomisationProps>;
}>;
