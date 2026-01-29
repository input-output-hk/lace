import { browser } from '@wdio/globals';
import { Logger } from '../support/logger';
import { switchToWindowWithLace } from '../utils/window';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';

/**
 * Reload the Chrome extension from chrome://extensions page.
 * This is needed after browser.reloadSession() because extensions sometimes
 * don't fully initialize until manually reloaded.
 */
export const reloadExtensionFromExtensionsPage = async (extensionId: string): Promise<void> => {
  const startTime = Date.now();
  Logger.log(`[reloadExtension] Starting extension reload for ID: ${extensionId}`);
  
  try {
    await browser.url('chrome://extensions');
    await browser.pause(500);
    
    const reloaded = await browser.execute((extId: string) => {
      try {
        const manager = document.querySelector('extensions-manager');
        if (!manager || !manager.shadowRoot) {
          return { success: false, error: 'extensions-manager not found' };
        }
        
        const itemList = manager.shadowRoot.querySelector('extensions-item-list');
        if (!itemList || !itemList.shadowRoot) {
          return { success: false, error: 'extensions-item-list not found' };
        }
        
        const items = itemList.shadowRoot.querySelectorAll('extensions-item');
        for (const item of items) {
          if (item.id === extId) {
            const shadowRoot = item.shadowRoot;
            if (!shadowRoot) {
              return { success: false, error: 'extension item shadow root not found' };
            }
            
            const reloadButton = shadowRoot.querySelector('#dev-reload-button') as HTMLElement;
            if (reloadButton) {
              reloadButton.click();
              return { success: true, error: null };
            }
            
            const iconButton = shadowRoot.querySelector('cr-icon-button[id="dev-reload-button"]') as HTMLElement;
            if (iconButton) {
              iconButton.click();
              return { success: true, error: null };
            }
            
            return { success: false, error: 'reload button not found in extension item' };
          }
        }
        
        return { success: false, error: `extension with ID ${extId} not found` };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }, extensionId);
    
    if (reloaded.success) {
      Logger.log(`[reloadExtension] Extension reloaded successfully in ${Date.now() - startTime}ms`);
      await browser.pause(1000);
    } else {
      Logger.warn(`[reloadExtension] Could not reload extension: ${reloaded.error}`);
    }
  } catch (error: any) {
    Logger.error(`[reloadExtension] Error during extension reload: ${error.message}`);
  }
};

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
        const existingWallets = await window.firstValueFrom(window.walletRepository.wallets$);
        const walletExists = existingWallets.some(w => w.walletId === walletsObj[0].walletId);
        if (!walletExists) {
          await walletRepository.addWallet(walletsObj[0]);
        }
      })()
    `
  );
};

export const addAndActivateWalletInRepository = async (wallet: string): Promise<void> =>
  await browser.execute(
    `
      return (async () => {
        let walletsObj = JSON.parse('${wallet}');
        const existingWallets = await window.firstValueFrom(window.walletRepository.wallets$);
        const walletExists = existingWallets.some(w => w.walletId === walletsObj[0].walletId);
        
        if (!walletExists) {
          await walletRepository.addWallet(walletsObj[0]);
          // Wait for Lace to register the added wallet
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
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
