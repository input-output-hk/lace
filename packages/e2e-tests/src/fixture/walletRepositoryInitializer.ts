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
      await window.walletManager.deactivate();
      const wallets = await window.firstValueFrom(window.walletRepository.wallets$);
      for (const wallet of wallets) {
        await window.walletRepository.removeWallet(wallet.walletId);
      }
      return JSON.stringify(wallets);
    })()
  `);
};

export const getWalletsFromRepository = async (): Promise<any[]> =>
  await browser.execute(`
      const wallets = await window.firstValueFrom(window.walletRepository.wallets$);
      return wallets;
  `);

export const addAndActivateWalletInRepository = async (wallet: string): Promise<number> =>
  await browser.execute(
    `
      let walletsObj = JSON.parse('${wallet}');
      await walletRepository.addWallet(walletsObj[0]);
       await walletManager.activate({
        walletId: walletsObj[0].walletId,
        accountIndex: walletsObj[0].accounts[0].accountIndex,
        chainId: { networkId: 0, networkMagic: 1 }
      })
  `
  );

export const addAndActivateWalletsInRepository = async (wallets: TestWalletName[]): Promise<void> => {
  const walletsRepositoryArray = wallets.map((wallet) => getTestWallet(wallet).repository as string);

  for (const wallet of walletsRepositoryArray.reverse()) {
    await addAndActivateWalletInRepository(wallet);
  }
};
