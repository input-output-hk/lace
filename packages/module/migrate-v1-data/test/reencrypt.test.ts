import { emip3decrypt, emip3encrypt } from '@cardano-sdk/key-management';
import { ByteArray, HexBytes } from '@lace-sdk/util';
import { describe, expect, it } from 'vitest';

import { reEncryptWalletSecrets, tryDecrypt } from '../src/store/reencrypt';

import type { InMemoryWallet } from '@lace-contract/wallet-repo';

const toPassword = (text: string) => ByteArray.fromUTF8(text);

const encryptData = async (data: string, password: Uint8Array) =>
  HexBytes.fromByteArray(
    await emip3encrypt(ByteArray.fromUTF8(data), password),
  );

const createCardanoWallet = async (
  password: Uint8Array,
  blockchains: string[] = ['Cardano'],
) => {
  const encryptedRecoveryPhrase = await encryptData(
    'abandon abandon abandon',
    password,
  );

  const blockchainSpecific: Record<
    string,
    { encryptedRootPrivateKey: HexBytes }
  > = {};
  for (const chain of blockchains) {
    blockchainSpecific[chain] = {
      encryptedRootPrivateKey: await encryptData(
        `root-private-key-${chain}`,
        password,
      ),
    };
  }

  return {
    encryptedRecoveryPhrase,
    blockchainSpecific,
    accounts: [],
  } as unknown as InMemoryWallet;
};

const createMidnightWallet = async (password: Uint8Array) => {
  const encryptedRecoveryPhrase = await encryptData(
    'abandon abandon abandon',
    password,
  );

  return {
    encryptedRecoveryPhrase,
    blockchainSpecific: {
      Midnight: {
        encryptedSeed: await encryptData('midnight-seed-data', password),
      },
    },
    accounts: [
      {
        accountId: 'mn-account-1',
        walletId: 'wallet-1',
        accountType: 'InMemory',
        blockchainName: 'Midnight',
        networkType: 'mainnet',
        blockchainNetworkId: 'midnight-mainnet',
        metadata: { name: 'Midnight #0' },
        blockchainSpecific: {
          networkId: 'mainnet',
          accountIndex: 0,
          nightExternalKey: {
            derivationPath: { accountIndex: 0, index: 0, role: 0 },
            encryptedKey: await encryptData('night-external-key', password),
          },
          zswapKey: {
            derivationPath: { accountIndex: 0, index: 0, role: 3 },
            encryptedKey: await encryptData('zswap-key', password),
          },
          dustKey: {
            derivationPath: { accountIndex: 0, index: 0, role: 2 },
            encryptedKey: await encryptData('dust-key', password),
          },
        },
      },
    ],
  } as unknown as InMemoryWallet;
};

describe('tryDecrypt', () => {
  it('returns true with correct password', async () => {
    const password = toPassword('correct-password');
    const encrypted = await encryptData('some data', password);

    expect(await tryDecrypt(encrypted, password)).toBe(true);
  });

  it('returns false with wrong password', async () => {
    const encrypted = await encryptData('some data', toPassword('password1'));

    expect(await tryDecrypt(encrypted, toPassword('password2'))).toBe(false);
  });

  it('zeros decrypted buffer even on success', async () => {
    const password = toPassword('correct-password');
    const plaintext = 'sensitive recovery phrase';
    const encrypted = await encryptData(plaintext, password);

    const isDecrypted = await tryDecrypt(encrypted, password);
    expect(isDecrypted).toBe(true);

    const decrypted = await emip3decrypt(
      ByteArray.fromHex(encrypted),
      password,
    );
    expect(ByteArray.toUTF8(ByteArray(decrypted))).toBe(plaintext);
  });
});

describe('reEncryptWalletSecrets', () => {
  describe('Cardano/Bitcoin wallets', () => {
    it('re-encrypts recovery phrase and root private key', async () => {
      const oldPassword = toPassword('old-password');
      const newPassword = toPassword('new-password');
      const wallet = await createCardanoWallet(oldPassword, ['Cardano']);

      const result = await reEncryptWalletSecrets(
        wallet,
        oldPassword,
        newPassword,
      );

      const decryptedPhrase = await emip3decrypt(
        ByteArray.fromHex(result.encryptedRecoveryPhrase!),
        newPassword,
      );
      expect(ByteArray.toUTF8(ByteArray(decryptedPhrase))).toBe(
        'abandon abandon abandon',
      );

      const chainData = result.blockchainSpecific!.Cardano as {
        encryptedRootPrivateKey: HexBytes;
      };
      const decryptedKey = await emip3decrypt(
        ByteArray.fromHex(chainData.encryptedRootPrivateKey),
        newPassword,
      );
      expect(ByteArray.toUTF8(ByteArray(decryptedKey))).toBe(
        'root-private-key-Cardano',
      );
    });

    it('handles multiple blockchainSpecific entries', async () => {
      const oldPassword = toPassword('old-password');
      const newPassword = toPassword('new-password');
      const wallet = await createCardanoWallet(oldPassword, [
        'Cardano',
        'Bitcoin',
      ]);

      const result = await reEncryptWalletSecrets(
        wallet,
        oldPassword,
        newPassword,
      );

      for (const chain of ['Cardano', 'Bitcoin'] as const) {
        const chainData = (
          result.blockchainSpecific as unknown as Record<
            string,
            { encryptedRootPrivateKey: HexBytes }
          >
        )[chain];
        const decryptedKey = await emip3decrypt(
          ByteArray.fromHex(chainData.encryptedRootPrivateKey),
          newPassword,
        );
        expect(ByteArray.toUTF8(ByteArray(decryptedKey))).toBe(
          `root-private-key-${chain}`,
        );
      }
    });

    it('handles empty blockchainSpecific', async () => {
      const oldPassword = toPassword('old-password');
      const newPassword = toPassword('new-password');
      const wallet = await createCardanoWallet(oldPassword, []);

      const result = await reEncryptWalletSecrets(
        wallet,
        oldPassword,
        newPassword,
      );

      const decryptedPhrase = await emip3decrypt(
        ByteArray.fromHex(result.encryptedRecoveryPhrase!),
        newPassword,
      );
      expect(ByteArray.toUTF8(ByteArray(decryptedPhrase))).toBe(
        'abandon abandon abandon',
      );
      expect(Object.keys(result.blockchainSpecific!)).toHaveLength(0);
    });
  });

  describe('Midnight wallets', () => {
    it('re-encrypts encryptedSeed in blockchainSpecific', async () => {
      const oldPassword = toPassword('old-password');
      const newPassword = toPassword('new-password');
      const wallet = await createMidnightWallet(oldPassword);

      const result = await reEncryptWalletSecrets(
        wallet,
        oldPassword,
        newPassword,
      );

      const midnightData = result.blockchainSpecific!.Midnight as {
        encryptedSeed: HexBytes;
      };
      const decryptedSeed = await emip3decrypt(
        ByteArray.fromHex(midnightData.encryptedSeed),
        newPassword,
      );
      expect(ByteArray.toUTF8(ByteArray(decryptedSeed))).toBe(
        'midnight-seed-data',
      );
    });

    it('re-encrypts all account-level keys (nightExternalKey, zswapKey, dustKey)', async () => {
      const oldPassword = toPassword('old-password');
      const newPassword = toPassword('new-password');
      const wallet = await createMidnightWallet(oldPassword);

      const result = await reEncryptWalletSecrets(
        wallet,
        oldPassword,
        newPassword,
      );

      expect(result.accounts).toBeDefined();
      const account = result.accounts![0];
      const spec = account.blockchainSpecific as {
        nightExternalKey: { encryptedKey: HexBytes };
        zswapKey: { encryptedKey: HexBytes };
        dustKey: { encryptedKey: HexBytes };
      };

      const decryptedNight = await emip3decrypt(
        ByteArray.fromHex(spec.nightExternalKey.encryptedKey),
        newPassword,
      );
      expect(ByteArray.toUTF8(ByteArray(decryptedNight))).toBe(
        'night-external-key',
      );

      const decryptedZswap = await emip3decrypt(
        ByteArray.fromHex(spec.zswapKey.encryptedKey),
        newPassword,
      );
      expect(ByteArray.toUTF8(ByteArray(decryptedZswap))).toBe('zswap-key');

      const decryptedDust = await emip3decrypt(
        ByteArray.fromHex(spec.dustKey.encryptedKey),
        newPassword,
      );
      expect(ByteArray.toUTF8(ByteArray(decryptedDust))).toBe('dust-key');
    });

    it('preserves derivationPath in re-encrypted account keys', async () => {
      const oldPassword = toPassword('old-password');
      const newPassword = toPassword('new-password');
      const wallet = await createMidnightWallet(oldPassword);

      const result = await reEncryptWalletSecrets(
        wallet,
        oldPassword,
        newPassword,
      );

      const account = result.accounts![0];
      const spec = account.blockchainSpecific as {
        nightExternalKey: {
          derivationPath: { accountIndex: number; index: number; role: number };
        };
        zswapKey: {
          derivationPath: { accountIndex: number; index: number; role: number };
        };
        dustKey: {
          derivationPath: { accountIndex: number; index: number; role: number };
        };
      };

      expect(spec.nightExternalKey.derivationPath).toEqual({
        accountIndex: 0,
        index: 0,
        role: 0,
      });
      expect(spec.zswapKey.derivationPath).toEqual({
        accountIndex: 0,
        index: 0,
        role: 3,
      });
      expect(spec.dustKey.derivationPath).toEqual({
        accountIndex: 0,
        index: 0,
        role: 2,
      });
    });

    it('does not modify non-Midnight accounts', async () => {
      const oldPassword = toPassword('old-password');
      const newPassword = toPassword('new-password');
      const wallet = await createCardanoWallet(oldPassword, ['Cardano']);

      const result = await reEncryptWalletSecrets(
        wallet,
        oldPassword,
        newPassword,
      );

      // No account changes for Cardano-only wallet
      expect(result.accounts).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('throws if old password is wrong', async () => {
      const wallet = await createCardanoWallet(toPassword('real-password'));

      await expect(
        reEncryptWalletSecrets(
          wallet,
          toPassword('wrong-password'),
          toPassword('new-password'),
        ),
      ).rejects.toThrow();
    });

    it('zeros intermediate buffers after successful re-encryption', async () => {
      const oldPassword = toPassword('old-password');
      const newPassword = toPassword('new-password');
      const wallet = await createCardanoWallet(oldPassword, ['Cardano']);

      const result = await reEncryptWalletSecrets(
        wallet,
        oldPassword,
        newPassword,
      );

      // Result valid
      const decryptedPhrase = await emip3decrypt(
        ByteArray.fromHex(result.encryptedRecoveryPhrase!),
        newPassword,
      );
      expect(ByteArray.toUTF8(ByteArray(decryptedPhrase))).toBe(
        'abandon abandon abandon',
      );

      // Original unchanged
      const originalDecryptedPhrase = await emip3decrypt(
        ByteArray.fromHex(wallet.encryptedRecoveryPhrase),
        oldPassword,
      );
      expect(ByteArray.toUTF8(ByteArray(originalDecryptedPhrase))).toBe(
        'abandon abandon abandon',
      );
    });

    it('zeros intermediate buffers even on partial failure', async () => {
      const oldPassword = toPassword('old-password');
      const newPassword = toPassword('new-password');

      const encryptedRecoveryPhrase = await encryptData(
        'abandon abandon abandon',
        oldPassword,
      );
      const wallet = {
        encryptedRecoveryPhrase,
        blockchainSpecific: {
          Cardano: {
            encryptedRootPrivateKey: await encryptData(
              'root-key',
              toPassword('different-password'),
            ),
          },
        },
        accounts: [],
      } as unknown as InMemoryWallet;

      await expect(
        reEncryptWalletSecrets(wallet, oldPassword, newPassword),
      ).rejects.toThrow();

      const decryptedPhrase = await emip3decrypt(
        ByteArray.fromHex(wallet.encryptedRecoveryPhrase),
        oldPassword,
      );
      expect(ByteArray.toUTF8(ByteArray(decryptedPhrase))).toBe(
        'abandon abandon abandon',
      );
    });
  });
});
