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
    const getPassphrase = async () => Buffer.from(password, 'utf8');
    try {
      const keyAgent = await Wallet.KeyManagement.InMemoryKeyAgent.fromBip39MnemonicWords(
        {
          accountIndex: 0,
          chainId,
          getPassphrase,
          mnemonicWords: await getMnemonic(await getPassphrase()),
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
    }
  };
