import { Wallet } from '@lace/cardano';

export type GenerateSharedWalletKeyFn = (password: string) => Promise<Wallet.Crypto.Bip32PublicKeyHex>;

export class SharedWalletKeyGenerationAuthError extends Error {
  constructor() {
    super('Invalid password');
  }
}

type GenerateSharedWalletKeyDependencies = {
  chainId: Wallet.Cardano.ChainId;
  getMnemonic: (password: Uint8Array) => Promise<string[]>;
};

export const makeGenerateSharedWalletKey =
  ({ chainId, getMnemonic }: GenerateSharedWalletKeyDependencies): GenerateSharedWalletKeyFn =>
  async (password) => {
    const passphrase = Buffer.from(password, 'utf8');
    // Intentionally erasing password string for the security purpose
    password = '';
    try {
      const keyAgent = await Wallet.KeyManagement.InMemoryKeyAgent.fromBip39MnemonicWords(
        {
          accountIndex: 0,
          chainId,
          getPassphrase: async () => passphrase,
          mnemonicWords: await getMnemonic(passphrase),
          purpose: Wallet.KeyManagement.KeyPurpose.MULTI_SIG,
        },
        {
          bip32Ed25519: Wallet.bip32Ed25519,
          logger: console,
        },
      );

      return keyAgent.extendedAccountPublicKey;
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Unsupported state or unable to authenticate data') {
        throw new SharedWalletKeyGenerationAuthError();
      }
      throw error;
    } finally {
      // Clear any sensitive data from memory if possible
      passphrase.fill(0);
    }
  };
