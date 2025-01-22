import { browser } from '@wdio/globals';
import { Logger } from '../support/logger';
import { switchToWindowWithLace } from '../utils/window';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';

export const getNumWalletsInRepository = async (): Promise<number> =>
  await browser.execute(`
    return (async () => {
      const wallets = await window.firstValueFrom(window.walletRepository.wallets$);
      return wallets.length;
    })()
  `);

export const clearWalletRepository = async (): Promise<void> => {
  Logger.log('Removing wallets');
  await switchToWindowWithLace(0);
  await browser.execute(`
    return (async () => {
      const wallets = await window.firstValueFrom(window.walletRepository.wallets$);
      // reversing in order to delete shared wallets before dependent wallets
      for (const wallet of wallets.reverse()) {
        await window.walletRepository.removeWallet(wallet.walletId);
      }
      await window.walletManager.deactivate();
      return JSON.stringify(wallets);
    })()
  `);
};

export const getWalletsFromRepository = async (): Promise<any[]> =>
  await browser.execute(`
      const wallets = await window.firstValueFrom(window.walletRepository.wallets$);
      return wallets;
  `);

const addWalletInRepository = async (wallet: string): Promise<void> => {
  await browser.execute(
    `
      return (async () => {
        let walletsObj = JSON.parse('${wallet}');
        await walletRepository.addWallet(walletsObj[0]);
      })()
    `
  );
};

export const addAndActivateWalletInRepository = async (wallet: string): Promise<void> =>
  await browser.execute(
    `
      return (async () => {
        let walletsObj = JSON.parse('${wallet}');
        await walletRepository.addWallet(walletsObj[0]);
        // wait for Lace to auto-activate the added wallet,
        // which might use a different network than we want to set here
        // this is still a race and we should rework wallet initialization
        await new Promise(resolve => setTimeout(resolve, 1000));
        await walletManager.activate({
          walletId: walletsObj[0].walletId,
          accountIndex: walletsObj[0].accounts[0].accountIndex,
          chainId: { networkId: 0, networkMagic: 1 }
        });
      })()
  `
  );

export const addAndActivateWalletsInRepository = async (wallets: TestWalletName[]): Promise<void> => {
  const walletsRepositoryArray = wallets.map((wallet) => getTestWallet(wallet).repository as string);

  for (const wallet of walletsRepositoryArray.slice(1).reverse()) {
    await addWalletInRepository(wallet);
  }
  await addAndActivateWalletInRepository(walletsRepositoryArray[0]);
};
