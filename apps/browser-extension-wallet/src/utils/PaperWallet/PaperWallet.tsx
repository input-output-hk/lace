import { readOnlyText, readOnlyImage } from '@pdfme/schemas';
import { generate } from '@pdfme/generator';
import { templateSchema } from './template';

export const paperWallet = async ({
  walletName,
  walletAddress,
  shieldedMessageQrCode,
  publicQrCode,
  pgpRef,
  creationDate
}: {
  walletName: string;
  walletAddress: string;
  shieldedMessageQrCode: string;
  publicQrCode: string;
  pgpRef: string;
  creationDate: string;
}): Promise<Uint8Array> => {
  const inputs = [{ walletAddress, walletName, shieldedMessageQrCode, pgpRef, creationDate, publicQrCode }];

  return await generate({
    template: templateSchema({ walletAddress, walletName, shieldedMessageQrCode, pgpRef, creationDate, publicQrCode }),
    inputs,
    plugins: {
      readOnlyImage,
      readOnlyText
    }
  });
};
