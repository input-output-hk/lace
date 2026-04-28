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
import type { InMemoryWallet } from '@lace-contract/wallet-repo';

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
 * Factory for creating in-memory wallet entities.
 */
export const createInMemoryWalletEntityFactory = ({
  integrations,
  logger,
}: CreateWalletEntityDependencies) => {
  return async ({
    walletName,
    blockchains,
    password,
    order,
    recoveryPhrase,
  }: CreateWalletEntityProps) => {
    const encryptedRecoveryPhrase = await encryptRecoveryPhrase(
      recoveryPhrase,
      password,
    );
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

    const wallet: InMemoryWallet = {
      walletId,
      encryptedRecoveryPhrase: HexBytes(encryptedRecoveryPhrase),
      metadata: { name: walletName, order },
      type: WalletType.InMemory,
      accounts: integrationResults.flatMap(({ accounts }) => accounts),
      blockchainSpecific: integrationResults
        .map(({ blockchainName, blockchainSpecificWalletData }) => ({
          [blockchainName]: blockchainSpecificWalletData,
        }))
        .reduce(
          (accumulator, value) => ({ ...accumulator, ...value }),
          {} as BlockchainSpecificDataMap,
        ),
      isPassphraseConfirmed: false,
    };

    return wallet;
  };
};
