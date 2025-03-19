import { Wallet } from '@lace/cardano';
import { Buffer } from 'buffer';

export type GenerateSharedWalletKeyFn = (password?: string) => Promise<Wallet.Cardano.Cip1854ExtendedAccountPublicKey>;

export class SharedWalletKeyGenerationAuthError extends Error {
  constructor() {
    super('Invalid password');
  }
}

type GenerateSharedWalletKeyDependencies = {
  getSharedWalletExtendedPublicKey: (
    passphrase?: Uint8Array,
  ) => Promise<Wallet.Cardano.Cip1854ExtendedAccountPublicKey>;
};

export const makeGenerateSharedWalletKey =
  ({ getSharedWalletExtendedPublicKey }: GenerateSharedWalletKeyDependencies): GenerateSharedWalletKeyFn =>
  async (password) => {
    let passphrase;
    if (password) {
      passphrase = Buffer.from(password, 'utf8');
      // Intentionally erasing password string for the security purpose
      password = '';
    }
    try {
      return await getSharedWalletExtendedPublicKey(passphrase);
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Unsupported state or unable to authenticate data') {
        throw new SharedWalletKeyGenerationAuthError();
      }
      throw error;
    } finally {
      // Clear any sensitive data from memory if possible
      passphrase?.fill(0);
    }
  };
