import { Wallet } from '@lace/cardano';

type MultisigTxData = {
  metadata: {
    chainId: `cip34:${number}-${number}`;
    createdAt: Date;
    createdBy: string;
    note?: string;
  };
  transaction: {
    cborHex: string;
  };
  version: string;
};

export const importMultiSigTransaction = async (file: File): Promise<Wallet.Cardano.Tx<Wallet.Cardano.TxBody>> => {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.addEventListener('load', async (e) => {
      try {
        const {
          transaction: { cborHex },
        } = JSON.parse(<string>e.target.result);

        const coSignedTx = Wallet.util.cborToTransaction(cborHex);

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

export const exportMultisigTransaction = async (
  signedTx: Wallet.KeyManagement.WitnessedTx,
  publicKey: Wallet.Crypto.Bip32PublicKeyHex,
  chainId: Wallet.Cardano.ChainId,
  note?: string,
) => {
  const multisigTxData: MultisigTxData = {
    metadata: {
      chainId: `cip34:${chainId.networkId}-${chainId.networkMagic}`,
      createdAt: new Date(),
      createdBy: publicKey,
      note,
    },
    transaction: {
      cborHex: signedTx.cbor,
    },
    version: '1.0.0',
  };

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
