import { emip3decrypt } from '@cardano-sdk/key-management';
import { CustomError } from 'ts-custom-error';

import type {
  AddInMemoryAccountsProps,
  AddInMemoryAccountsResult,
  AddInMemoryWalletAccounts,
  CreateBlockchainSpecificWalletData,
  CreateInMemoryWalletAccounts,
  CreateInMemoryWalletDependencies,
} from './types';
import type { InMemoryWallet } from '@lace-contract/wallet-repo';
import type { BlockchainName } from '@lace-lib/util-store';

/**
 * Thrown when adding an account on a new blockchain requires deriving a
 * root key from the mnemonic, but the wallet has none (Nami-imported).
 */
export class RecoveryPhraseUnavailableError extends CustomError {
  public constructor() {
    super(
      'Cannot derive a new blockchain root key: this wallet has no mnemonic stored',
    );
  }
}

/**
 * Creates a type-safe function to get blockchain-specific data from a wallet.
 */
export const createGetBlockchainData =
  <BlockchainSpecificWalletData>(blockchainName: BlockchainName) =>
  (wallet: InMemoryWallet): BlockchainSpecificWalletData | undefined => {
    const blockchainSpecificMap = wallet.blockchainSpecific as Record<
      BlockchainName,
      unknown
    >;
    return blockchainSpecificMap[blockchainName] as
      | BlockchainSpecificWalletData
      | undefined;
  };

type CreateAddAccountsParams<
  BlockchainSpecificAccountData,
  BlockchainSpecificWalletData,
> = {
  blockchainName: BlockchainName;
  createAccounts: CreateInMemoryWalletAccounts<
    BlockchainSpecificAccountData,
    BlockchainSpecificWalletData
  >;
  createBlockchainSpecificWalletData: CreateBlockchainSpecificWalletData<BlockchainSpecificWalletData>;
};

/**
 * Factory function that creates a standardized `addAccounts` implementation.
 *
 * Handles both scenarios:
 * - Existing blockchain: uses wallet's blockchainSpecific data to derive the accounts
 * - New blockchain: decrypts wallet's recoveryPhrase, creates blockchain data, creates accounts
 *
 * Returns a wallet with merged accounts and blockchainSpecific data.
 *
 * @example
 * ```typescript
 * export const addAccounts = createAddAccounts({
 *   blockchainName: 'Cardano',
 *   createAccounts,
 *   createBlockchainSpecificWalletData,
 * });
 * ```
 */
export const createAddAccounts = <
  BlockchainSpecificAccountData,
  BlockchainSpecificWalletData,
>({
  blockchainName,
  createAccounts,
  createBlockchainSpecificWalletData,
}: CreateAddAccountsParams<
  BlockchainSpecificAccountData,
  BlockchainSpecificWalletData
>): AddInMemoryWalletAccounts<BlockchainSpecificAccountData> => {
  const getBlockchainData =
    createGetBlockchainData<BlockchainSpecificWalletData>(blockchainName);

  return async (
    props: AddInMemoryAccountsProps,
    dependencies: CreateInMemoryWalletDependencies,
  ): Promise<AddInMemoryAccountsResult<BlockchainSpecificAccountData>> => {
    const { wallet, accountIndex, password, accountName, targetNetworks } =
      props;
    let blockchainSpecificData = getBlockchainData(wallet);
    let newBlockchainSpecificWalletData:
      | BlockchainSpecificWalletData
      | undefined;

    // New blockchain - decrypt recovery phrase and create blockchain data
    if (!blockchainSpecificData) {
      if (!wallet.encryptedRecoveryPhrase) {
        throw new RecoveryPhraseUnavailableError();
      }
      const recoveryPhraseBytes = await emip3decrypt(
        Buffer.from(wallet.encryptedRecoveryPhrase, 'hex'),
        password,
      );
      // Store reference to clear in finally block (emip3decrypt returns Buffer at runtime)
      const recoveryPhraseBuffer = Buffer.from(recoveryPhraseBytes);

      try {
        const recoveryPhrase = recoveryPhraseBuffer.toString('utf8').split(' ');

        blockchainSpecificData = await createBlockchainSpecificWalletData(
          {
            walletId: wallet.walletId,
            password,
            recoveryPhrase,
          },
          dependencies,
        );
        newBlockchainSpecificWalletData = blockchainSpecificData;
      } finally {
        // Clear sensitive data from memory
        recoveryPhraseBytes.fill(0);
        recoveryPhraseBuffer.fill(0);
      }
    }

    const newAccounts = await createAccounts(
      {
        blockchainSpecific: blockchainSpecificData,
        accountIndex,
        walletId: wallet.walletId,
        blockchainName,
        password,
        accountName,
        targetNetworks,
      },
      dependencies,
    );

    return {
      wallet: {
        ...wallet,
        accounts: [...wallet.accounts, ...newAccounts],
        ...(newBlockchainSpecificWalletData && {
          blockchainSpecific: {
            ...(wallet.blockchainSpecific as Record<BlockchainName, unknown>),
            [blockchainName]: newBlockchainSpecificWalletData,
          },
        }),
      } as InMemoryWallet<BlockchainSpecificAccountData>,
    };
  };
};
