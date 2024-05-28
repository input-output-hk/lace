import { getTestWallet } from '../support/walletConfiguration';
import clipboard from 'clipboardy';
import { AddressType } from '../enums/AddressTypeEnum';

export const parseWalletAddress = async (wallet: string, addressType = AddressType.Main): Promise<string> => {
  switch (addressType) {
    case AddressType.Main:
      return getTestWallet(wallet).address as string;
    case AddressType.Copied:
      return await clipboard.read();
    case AddressType.OtherMultiaddress:
      return getTestWallet(wallet).accounts?.[0].additionalMultiAddress as string;
    case AddressType.SecondAccount:
      return getTestWallet(wallet).accounts?.[1].address as string;
    default:
      throw new Error(`Unsupported address type: ${addressType}`);
  }
};
