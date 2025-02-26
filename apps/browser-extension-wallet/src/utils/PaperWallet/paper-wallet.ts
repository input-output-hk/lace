import QRCode from 'qrcode';
import { readPgpPublicKey, encryptMessageWithPgpAsBinaryFormat } from '../pgp';
import { paperWallet } from './PaperWallet';
import { Wallet } from '@lace/cardano';
import { PublicPgpKeyData, PaperWalletPDF } from '@src/types';

interface GeneratePaperWalletProps {
  mnemonic: string[];
  pgpInfo: PublicPgpKeyData;
  walletAddress: Wallet.Cardano.PaymentAddress;
  chain: Wallet.ChainName;
  walletName: string;
}

export const generatePaperWalletPdf = async ({
  mnemonic,
  pgpInfo,
  walletAddress,
  chain,
  walletName
}: GeneratePaperWalletProps): Promise<PaperWalletPDF> => {
  try {
    const publicKey = await readPgpPublicKey({ publicKey: pgpInfo.pgpPublicKey });

    const encryptedMessage = await encryptMessageWithPgpAsBinaryFormat({
      publicKey,
      message: mnemonic.join(' ')
    });
    const shieldedMessageQrCode = await QRCode.toDataURL(
      [
        { mode: 'byte', data: encryptedMessage },
        { mode: 'byte', data: Buffer.from(walletAddress) },
        { mode: 'byte', data: Buffer.from(chain) }
      ],
      {
        errorCorrectionLevel: 'M',
        rendererOpts: {
          quality: 1
        },
        margin: 0
      }
    );

    const publicQrCode = await QRCode.toDataURL(walletAddress, {
      rendererOpts: {
        quality: 1
      },
      margin: 0
    });

    const paperWalletPdf = await paperWallet({
      pgpRef: pgpInfo.pgpKeyReference,
      creationDate: new Date().toLocaleDateString(navigator.language, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      walletAddress,
      walletName,
      shieldedMessageQrCode,
      publicQrCode
    });

    const blob = new Blob([paperWalletPdf.buffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    return {
      // eslint-disable-next-line unicorn/no-null
      error: null,
      loading: false,
      url,
      blob
    };
  } catch (error) {
    return { error, loading: false };
  }
};
