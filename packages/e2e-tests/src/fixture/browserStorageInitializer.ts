import { WalletConfig } from '../support/walletConfiguration';
import { setBackgroundStorage, setMigrationState } from '../utils/browserStorage';
import { Logger } from '../support/logger';
import { switchToWindowWithLace } from '../utils/window';
import { browser } from '@wdio/globals';

export const initializeBrowserStorage = async (wallet: WalletConfig): Promise<void> => {
  try {
    await setBackgroundStorage({ mnemonic: wallet?.backgroundStorage?.mnemonic });
  } catch (error) {
    Logger.log(`Failed to set mnemonic in browser storage due to: ${error}`);
  }

  try {
    await setBackgroundStorage({ keyAgentsByChain: JSON.parse(String(wallet?.backgroundStorage?.keyAgentsByChain)) });
  } catch (error) {
    Logger.log(`Failed to set keyAgentsByChain in browser storage due to: ${error}`);
  }

  try {
    await setBackgroundStorage({
      usePersistentUserId: JSON.parse(String(wallet?.backgroundStorage?.usePersistentUserId))
    });
  } catch (error) {
    Logger.log(`Failed to set usePersistentUserId in browser storage due to: ${error}`);
  }

  await setMigrationState();
};

export const getNumWalletsInRepository = async (): Promise<number> =>
  await browser.execute(`
    return (async () => {
      const wallets = await window.firstValueFrom(window.walletRepository.wallets$);
      return wallets.length;
    })()
  `);

export const clearWalletRepository = async (): Promise<void> => {
  try {
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
  } catch (error) {
    Logger.log(`Failed to clear wallet repository: ${error}`);
  }
};
