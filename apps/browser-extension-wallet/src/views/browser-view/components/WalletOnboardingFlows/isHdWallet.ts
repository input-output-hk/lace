import { isScriptAddress } from '@cardano-sdk/wallet';
import { Wallet } from '@lace/cardano';
import { filter, firstValueFrom } from 'rxjs';

export const isHdWallet = async (wallet: Wallet.ObservableWallet): Promise<boolean> => {
  const addresses = await firstValueFrom(wallet.addresses$.pipe(filter((a) => a.length > 0)));
  return addresses.some((addr) => !isScriptAddress(addr) && addr.index > 0);
};
