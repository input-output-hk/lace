import { getTestWallet } from '../support/walletConfiguration';
import { AddressType } from '../enums/AddressTypeEnum';

export const parseWalletAddress = (wallet: string, addressType = AddressType.Main): string => {
  switch (addressType) {
    case AddressType.Main:
      return getTestWallet(wallet).accounts[0].address as string;
    case AddressType.OtherMultiaddress:
      return getTestWallet(wallet).accounts?.[0].additionalMultiAddress as string;
    case AddressType.SecondAccount:
      return getTestWallet(wallet).accounts?.[1].address as string;
    default:
      throw new Error(`Unsupported address type: ${addressType}`);
  }
};
