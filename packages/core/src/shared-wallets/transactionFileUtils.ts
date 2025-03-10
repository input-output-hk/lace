import { Wallet } from '@lace/cardano';
import { SharedWalletTransactionSchema } from './docs/schema/shared-wallet-transaction-type-autogenerated';

type MultisigTxParams = {
  cborHex: Wallet.Serialization.TxCBOR;
  chainId: Wallet.Cardano.ChainId;
  note?: string;
  publicKey: Wallet.Crypto.Bip32PublicKeyHex;
};

export const constructMultiSigTransactionData = ({
  cborHex,
  publicKey,
  chainId,
  note,
}: MultisigTxParams): SharedWalletTransactionSchema => ({
  metadata: {
    chainId: `cip34:${chainId.networkId}-${chainId.networkMagic}`,
    createdAt: new Date().toISOString(),
    createdBy: publicKey,
    note,
  },
  transaction: {
    cborHex,
  },
  version: '1.0.0',
});

export const importMultiSigTransaction = async (file: File): Promise<Wallet.Cardano.Tx<Wallet.Cardano.TxBody>> => {
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.addEventListener('load', async (e) => {
      try {
        const data = JSON.parse(<string>e.target?.result) as SharedWalletTransactionSchema;

        const {
          transaction: { cborHex },
        } = data;

        const coSignedTx = Wallet.Serialization.TxCBOR.deserialize(Wallet.Serialization.TxCBOR(cborHex));

        resolve(coSignedTx);
      } catch (error) {
        reject(new Error(`Error parsing JSON: ${error.message}`));
      }
    });

    reader.addEventListener('error', () => {
      reject(new Error('Error reading file'));
    });

    reader.readAsText(file);
  });
};

export const exportMultisigTransaction = async ({ cborHex, publicKey, chainId, note }: MultisigTxParams) => {
  const multisigTxData = constructMultiSigTransactionData({ cborHex, chainId, note, publicKey });

  // eslint-disable-next-line no-magic-numbers
  const jsonStr = JSON.stringify(multisigTxData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });

  const link = document.createElement('a');

  link.download = `Wallet_sign_transaction+${Date.now()}`;
  link.href = window.URL.createObjectURL(blob);

  document.body.append(link);

  link.click();
  link.remove();
};
