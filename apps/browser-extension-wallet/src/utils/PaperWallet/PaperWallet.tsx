import { readOnlyText, readOnlyImage } from '@pdfme/schemas';
import { generate } from '@pdfme/generator';
import { templateSchema as templateInternationalStandard } from './templateInternationalStandard';
import { templateSchema as templateUS } from './templateUS';

const US_NAVIGATOR_LANGUAGE_REGEX = new RegExp(/us/, 'gi');

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

  const templateChoice = US_NAVIGATOR_LANGUAGE_REGEX.test(navigator.language)
    ? templateUS
    : templateInternationalStandard;

  return await generate({
    template: templateChoice({ walletAddress, walletName, shieldedMessageQrCode, pgpRef, creationDate, publicQrCode }),
    inputs,
    plugins: {
      readOnlyImage,
      readOnlyText
    }
  });
};
