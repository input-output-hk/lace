import { WalletId, WalletType } from '@lace-contract/wallet-repo';
import { encryptRecoveryPhrase } from '@lace-lib/core';

import type {
  BlockchainSpecificDataMap,
  CreateWalletEntityDependencies,
  CreateWalletEntityProps,
} from './types';
import type { AuthSecret } from '@lace-contract/authentication-prompt';
import type {
  InMemoryWallet,
  InMemoryWalletAccount,
  LazyInMemoryWallet,
  LazyInMemoryWalletAccount,
} from '@lace-contract/wallet-repo';

/**
 * Callable returned by {@link createInMemoryWalletEntityFactory}.
 *
 * Overloads narrow the return type: supplying a `password` yields an
 * {@link InMemoryWallet}; omitting it yields a {@link LazyInMemoryWallet}.
 */
export type CreateInMemoryWalletEntity = {
  (
    props: CreateWalletEntityProps & { password: AuthSecret },
  ): Promise<InMemoryWallet>;
  (
    props: CreateWalletEntityProps & { password?: undefined },
  ): Promise<LazyInMemoryWallet>;
  (props: CreateWalletEntityProps): Promise<
    InMemoryWallet | LazyInMemoryWallet
  >;
};

/**
 * Factory for creating in-memory wallet entities.
 *
 * With `password`: encrypts the recovery phrase and returns an
 * {@link InMemoryWallet}. Without `password`: persists no seed material and
 * returns a {@link LazyInMemoryWallet} — signing relies on an external module
 * re-supplying the mnemonic on demand.
 */
export const createInMemoryWalletEntityFactory = ({
  integrations,
  logger,
}: CreateWalletEntityDependencies): CreateInMemoryWalletEntity => {
  const create = async ({
    walletName,
    blockchains,
    password,
    order,
    recoveryPhrase,
  }: CreateWalletEntityProps): Promise<InMemoryWallet | LazyInMemoryWallet> => {
    const walletId = WalletId.deriveFromMnemonic(recoveryPhrase);

    const integrationResults = await Promise.all(
      integrations
        .filter(({ blockchainName }) => blockchains.includes(blockchainName))
        .map(async integration =>
          integration
            .initializeWallet(
              { recoveryPhrase, walletId, order, walletName, password },
              { logger },
            )
            .then(result => ({
              ...result,
              blockchainName: integration.blockchainName,
            })),
        ),
    );

    const blockchainSpecific = integrationResults
      .map(({ blockchainName, blockchainSpecificWalletData }) => ({
        [blockchainName]: blockchainSpecificWalletData,
      }))
      .reduce(
        (accumulator, value) => ({ ...accumulator, ...value }),
        {} as BlockchainSpecificDataMap,
      );
    const accounts = integrationResults.flatMap(({ accounts }) => accounts);

    if (!password) {
      return {
        accounts: accounts as LazyInMemoryWalletAccount[],
        blockchainSpecific,
        metadata: { name: walletName, order },
        type: WalletType.LazyInMemory,
        walletId,
      };
    }

    const encryptedRecoveryPhrase = await encryptRecoveryPhrase(
      recoveryPhrase,
      password,
    );

    return {
      accounts: accounts as InMemoryWalletAccount[],
      blockchainSpecific,
      encryptedRecoveryPhrase,
      isPassphraseConfirmed: false,
      metadata: { name: walletName, order },
      type: WalletType.InMemory,
      walletId,
    };
  };

  return create as CreateInMemoryWalletEntity;
};
