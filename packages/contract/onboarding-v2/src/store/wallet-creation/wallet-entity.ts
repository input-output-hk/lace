import * as Crypto from '@cardano-sdk/crypto';
import { emip3encrypt, util } from '@cardano-sdk/key-management';
import { WalletId, WalletType } from '@lace-contract/wallet-repo';
import { ByteArray, HexBytes } from '@lace-sdk/util';

import type {
  BlockchainSpecificDataMap,
  CreateWalletEntityDependencies,
  CreateWalletEntityProps,
} from './types';
import type { HexBlob } from '@cardano-sdk/util';
import type { AuthSecret } from '@lace-contract/authentication-prompt';
import type {
  InMemoryWallet,
  InMemoryWalletAccount,
  LazyInMemoryWallet,
  LazyInMemoryWalletAccount,
} from '@lace-contract/wallet-repo';

export const computeWalletId = (recoveryPhrase: string[]): WalletId => {
  const phrase = util.joinMnemonicWords(recoveryPhrase);
  const phraseHex = Buffer.from(phrase, 'utf8').toString('hex') as HexBlob;
  const BYTES_MIN = 16;

  const digest = Crypto.blake2b.hash<Crypto.Hash32ByteBase16>(
    phraseHex,
    BYTES_MIN,
  );

  const walletIdHex = Crypto.blake2b.hash<Crypto.Hash32ByteBase16>(
    digest as HexBlob,
    BYTES_MIN,
  );

  return WalletId(walletIdHex);
};

/**
 * Encrypts the recovery phrase with the provided password.
 * Uses EMIP3 encryption standard for secure storage.
 */
export const encryptRecoveryPhrase = async (
  recoveryPhrase: string[],
  password: AuthSecret,
): Promise<string> => {
  try {
    const walletEncrypted = await emip3encrypt(
      ByteArray.fromUTF8(util.joinMnemonicWords(recoveryPhrase)),
      password,
    );
    return HexBytes.fromByteArray(ByteArray(walletEncrypted));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown encryption error';
    throw new Error(`Failed to encrypt recovery phrase: ${message}`);
  }
};

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
    const walletId = computeWalletId(recoveryPhrase);

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
      encryptedRecoveryPhrase: HexBytes(encryptedRecoveryPhrase),
      isPassphraseConfirmed: false,
      metadata: { name: walletName, order },
      type: WalletType.InMemory,
      walletId,
    };
  };

  return create as CreateInMemoryWalletEntity;
};
