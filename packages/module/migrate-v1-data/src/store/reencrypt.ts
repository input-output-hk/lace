import { emip3decrypt, emip3encrypt } from '@cardano-sdk/key-management';
import { ByteArray, HexBytes } from '@lace-sdk/util';

import type { BitcoinSpecificInMemoryWalletData } from '@lace-contract/bitcoin-context';
import type { CardanoSpecificInMemoryWalletData } from '@lace-contract/cardano-context';
import type {
  MidnightAccountProps,
  MidnightKeysData,
  MidnightSpecificInMemoryWalletData,
} from '@lace-contract/midnight-context';
import type {
  InMemoryWallet,
  InMemoryWalletAccount,
} from '@lace-contract/wallet-repo';
import type { BlockchainName } from '@lace-lib/util-store';

const isExpectedDecryptFailure = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return (
    message.includes('decrypt') ||
    message.includes('authenticat') ||
    message.includes('password') ||
    message.includes('mac')
  );
};

/**
 * Attempts to decrypt the given ciphertext with the given password. Returns
 * true on success, false on a recognised authentication failure. Unrecognised
 * exceptions are logged at error level and still return false.
 */
export const tryDecrypt = async (
  encryptedRecoveryPhrase: HexBytes,
  password: Uint8Array,
): Promise<boolean> => {
  let decrypted: Uint8Array | undefined;
  try {
    decrypted = await emip3decrypt(
      ByteArray.fromHex(encryptedRecoveryPhrase),
      password,
    );
    return true;
  } catch (error) {
    if (!isExpectedDecryptFailure(error)) {
      // eslint-disable-next-line no-console
      console.error('migrate-v1-data: unexpected tryDecrypt failure', error);
    }
    return false;
  } finally {
    decrypted?.fill(0);
  }
};

interface ReEncryptContext {
  oldPassword: Uint8Array;
  newPassword: Uint8Array;
  intermediateBuffers: Uint8Array[];
}

const reEncryptHexBytes = async (
  encrypted: HexBytes,
  context: ReEncryptContext,
): Promise<HexBytes> => {
  const decrypted = await emip3decrypt(
    ByteArray.fromHex(encrypted),
    context.oldPassword,
  );
  context.intermediateBuffers.push(decrypted);
  const reEncrypted = await emip3encrypt(decrypted, context.newPassword);
  return HexBytes.fromByteArray(reEncrypted);
};

interface ChainSecretReEncryptor<TChainData, TAccountSpecific> {
  /**
   * Re-encrypts every secret stored on the chain-specific wallet data.
   * Returns a fresh object with re-encrypted fields preserved alongside
   * any non-encrypted fields.
   */
  reEncryptChainData(
    data: TChainData,
    context: ReEncryptContext,
  ): Promise<TChainData>;

  /**
   * Verifies that every secret on the chain-specific wallet data decrypts
   * with the given password. Used by the optimistic-match check.
   */
  verifyChainData(data: TChainData, password: Uint8Array): Promise<boolean>;

  /**
   * Re-encrypts every per-account secret. Returns the same object reference
   * if the chain has no per-account secrets.
   */
  reEncryptAccount(
    account: InMemoryWalletAccount<TAccountSpecific>,
    context: ReEncryptContext,
  ): Promise<InMemoryWalletAccount<TAccountSpecific>>;

  /**
   * Verifies that every per-account secret decrypts with the password.
   * Returns true if the chain has no per-account secrets.
   */
  verifyAccount(
    account: InMemoryWalletAccount<TAccountSpecific>,
    password: Uint8Array,
  ): Promise<boolean>;
}

const reEncryptRootPrivateKey = async <
  T extends { encryptedRootPrivateKey: HexBytes },
>(
  data: T,
  context: ReEncryptContext,
): Promise<T> => ({
  ...data,
  encryptedRootPrivateKey: await reEncryptHexBytes(
    data.encryptedRootPrivateKey,
    context,
  ),
});

const cardanoReEncryptor: ChainSecretReEncryptor<
  CardanoSpecificInMemoryWalletData,
  unknown
> = {
  reEncryptChainData: reEncryptRootPrivateKey,
  verifyChainData: async (data, password) =>
    tryDecrypt(data.encryptedRootPrivateKey, password),
  reEncryptAccount: async account => account,
  verifyAccount: async () => true,
};

const bitcoinReEncryptor: ChainSecretReEncryptor<
  BitcoinSpecificInMemoryWalletData,
  unknown
> = {
  reEncryptChainData: reEncryptRootPrivateKey,
  verifyChainData: async (data, password) =>
    tryDecrypt(data.encryptedRootPrivateKey, password),
  reEncryptAccount: async account => account,
  verifyAccount: async () => true,
};

const reEncryptMidnightKey = async <K extends keyof MidnightKeysData>(
  account: InMemoryWalletAccount<MidnightAccountProps>,
  key: K,
  context: ReEncryptContext,
): Promise<MidnightKeysData[K]> => ({
  ...account.blockchainSpecific[key],
  encryptedKey: await reEncryptHexBytes(
    account.blockchainSpecific[key].encryptedKey,
    context,
  ),
});

const midnightReEncryptor: ChainSecretReEncryptor<
  MidnightSpecificInMemoryWalletData,
  MidnightAccountProps
> = {
  reEncryptChainData: async (data, context) => ({
    ...data,
    encryptedSeed: await reEncryptHexBytes(data.encryptedSeed, context),
  }),
  verifyChainData: async (data, password) =>
    tryDecrypt(data.encryptedSeed, password),
  reEncryptAccount: async (account, context) => {
    const [nightExternalKey, zswapKey, dustKey] = await Promise.all([
      reEncryptMidnightKey(account, 'nightExternalKey', context),
      reEncryptMidnightKey(account, 'zswapKey', context),
      reEncryptMidnightKey(account, 'dustKey', context),
    ]);
    return {
      ...account,
      blockchainSpecific: {
        ...account.blockchainSpecific,
        nightExternalKey,
        zswapKey,
        dustKey,
      },
    };
  },
  verifyAccount: async (account, password) =>
    tryDecrypt(
      account.blockchainSpecific.nightExternalKey.encryptedKey,
      password,
    ),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyChainReEncryptor = ChainSecretReEncryptor<any, any>;

const REENCRYPTORS: Record<BlockchainName, AnyChainReEncryptor> = {
  Cardano: cardanoReEncryptor as AnyChainReEncryptor,
  Bitcoin: bitcoinReEncryptor as AnyChainReEncryptor,
  Midnight: midnightReEncryptor as AnyChainReEncryptor,
};

const getReEncryptor = (chain: string): AnyChainReEncryptor => {
  const entry = REENCRYPTORS[chain as BlockchainName];
  if (!entry) {
    throw new Error(
      `migrate-v1-data: no re-encryptor registered for blockchain "${chain}"`,
    );
  }
  return entry;
};

/**
 * Re-encrypts a wallet's secrets with a new password. Iterates the typed
 * per-chain re-encryptor map and throws on unknown chains. All intermediate
 * decrypted buffers are zeroed before return.
 */
export const reEncryptWalletSecrets = async (
  wallet: InMemoryWallet,
  oldPassword: Uint8Array,
  newPassword: Uint8Array,
): Promise<Partial<InMemoryWallet>> => {
  const intermediateBuffers: Uint8Array[] = [];
  const context: ReEncryptContext = {
    oldPassword,
    newPassword,
    intermediateBuffers,
  };

  try {
    const encryptedRecoveryPhrase = wallet.encryptedRecoveryPhrase
      ? await reEncryptHexBytes(wallet.encryptedRecoveryPhrase, context)
      : undefined;

    const newBlockchainSpecific: Record<string, unknown> = {};
    for (const [chain, data] of Object.entries(wallet.blockchainSpecific)) {
      if (!data) continue;
      const reEncryptor = getReEncryptor(chain);
      newBlockchainSpecific[chain] = await reEncryptor.reEncryptChainData(
        data,
        context,
      );
    }

    const newAccounts = await Promise.all(
      wallet.accounts.map(async account => {
        const reEncryptor = getReEncryptor(account.blockchainName);
        return reEncryptor.reEncryptAccount(account, context);
      }),
    );

    const hasAccountChanges = newAccounts.some(
      (next, index) => next !== wallet.accounts[index],
    );

    return {
      ...(encryptedRecoveryPhrase ? { encryptedRecoveryPhrase } : {}),
      blockchainSpecific: newBlockchainSpecific,
      ...(hasAccountChanges
        ? { accounts: newAccounts as InMemoryWallet['accounts'] }
        : {}),
    };
  } finally {
    for (const buffer of intermediateBuffers) {
      buffer.fill(0);
    }
  }
};

/**
 * Defensive secondary-secret check for the optimistic-match path.
 *
 * The optimistic-match shortcut (skip re-encryption when the new app password
 * already decrypts the wallet's recovery phrase) relies on the V1 invariant
 * that every secret in an in-memory wallet is encrypted with the same wallet
 * password. This function asserts that invariant by also decrypting one
 * secondary secret per chain (and one Midnight account key, if present)
 * before declaring the wallet already correct.
 *
 * If any check fails, the caller must fall back to the manual re-encryption
 * path: the wallet has inconsistent encryption and cannot be trusted to be
 * unlockable with the app password alone.
 *
 * Nami-imported wallets have no `encryptedRecoveryPhrase`; they are verified
 * against chain-data and per-account secrets only.
 */
export const verifyAllSecretsDecryptable = async (
  wallet: InMemoryWallet,
  password: Uint8Array,
): Promise<boolean> => {
  if (
    wallet.encryptedRecoveryPhrase &&
    !(await tryDecrypt(wallet.encryptedRecoveryPhrase, password))
  ) {
    return false;
  }

  for (const [chain, data] of Object.entries(wallet.blockchainSpecific)) {
    if (!data) continue;
    const reEncryptor = getReEncryptor(chain);
    if (!(await reEncryptor.verifyChainData(data, password))) {
      return false;
    }
  }

  for (const account of wallet.accounts) {
    const reEncryptor = getReEncryptor(account.blockchainName);
    if (!(await reEncryptor.verifyAccount(account, password))) {
      return false;
    }
  }

  return true;
};
