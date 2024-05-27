import { getTestWallet } from '../support/walletConfiguration';
import clipboard from 'clipboardy';

export const parseWalletAddress = async (wallet: string, addressType = 'main'): Promise<string> => {
  switch (addressType) {
    case 'main':
      return String(getTestWallet(wallet).address as string);
    case 'copied':
      return String(await clipboard.read());
    case 'other multiaddress':
      return String(getTestWallet(wallet).accounts?.[0].additionalMultiAddress as string);
    case 'second account':
      return String(getTestWallet(wallet).accounts?.[1].address as string);
    default:
      throw new Error(`Unsupported address type: ${addressType}`);
  }
};
