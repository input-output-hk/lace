import { browser } from '@wdio/globals';
import { Logger } from '../support/logger';
import { switchToWindowWithLace } from '../utils/window';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';

// Crash screen selector
const CRASH_SCREEN_SELECTOR = '[data-testid="crash-reload"]';

/**
 * Check for app crash and throw immediately if detected
 */
const checkForCrashAndThrow = async (context: string): Promise<void> => {
  const hasCrash = await $(CRASH_SCREEN_SELECTOR).isExisting();
  if (hasCrash) {
    const url = await browser.getUrl();
    Logger.error(`[${context}] CRASH DETECTED! App crashed at URL: ${url}`);
    throw new Error(`App crashed during ${context}. Crash screen detected at ${url}`);
  }
};

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

export const addAndActivateWalletInRepository = async (wallet: string): Promise<void> => {
  const startTime = Date.now();
  let lastStatus: any = null;
  let attempts = 0;
  let onSetupPage = false;

  await browser.waitUntil(
    async () => {
      attempts++;
      try {
        // Check for crash first
        await checkForCrashAndThrow('addAndActivateWalletInRepository');

        const result = await browser.execute(
          `
            return (async () => {
              const walletData = '${wallet}';
              const status = {
                ready: false,
                added: false,
                activated: false,
                walletExists: false,
                hasWalletRepository: typeof window.walletRepository !== 'undefined',
                hasWalletManager: typeof window.walletManager !== 'undefined',
                hasFirstValueFrom: typeof window.firstValueFrom !== 'undefined',
                hasAddWallet: typeof window.walletRepository?.addWallet === 'function',
                hasActivate: typeof window.walletManager?.activate === 'function',
                currentPath: window.location.hash || window.location.pathname,
                isOnSetupPage: window.location.hash?.includes('/setup') || window.location.pathname?.includes('/setup'),
                hasCrash: !!document.querySelector('[data-testid="crash-reload"]'),
                error: null
              };
              
              // Fail fast if crash detected
              if (status.hasCrash) {
                status.error = 'CRASH_DETECTED';
                return status;
              }
              
              if (!status.hasWalletRepository || !status.hasWalletManager || 
                  !status.hasFirstValueFrom || !status.hasAddWallet || !status.hasActivate) {
                return status;
              }
              
              try {
                // Verify API is functional
                const existingWallets = await window.firstValueFrom(window.walletRepository.wallets$);
                status.ready = true;
                
                const walletsObj = JSON.parse(walletData);
                const walletToAdd = walletsObj[0];
                
                // Check if wallet already exists
                const walletExists = existingWallets.some(w => w.walletId === walletToAdd.walletId);
                
                if (walletExists) {
                  // Wallet already exists - just need to activate it
                  status.added = true;
                  status.walletExists = true;
                  console.log('[addAndActivateWalletInRepository] Wallet already exists, skipping add');
                } else {
                  // Try to add wallet - handle "already exists" error gracefully
                  try {
                    await window.walletRepository.addWallet(walletToAdd);
                    status.added = true;
                  } catch (addError) {
                    if (addError.message && addError.message.includes('already exists')) {
                      console.log('[addAndActivateWalletInRepository] Wallet already exists (caught), skipping add');
                      status.added = true;
                      status.walletExists = true;
                    } else {
                      throw addError;
                    }
                  }
                  
                  // Wait for Lace to register the added wallet
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
                // Activate with retry logic for "wallet not found" errors
                let activateAttempts = 0;
                const maxActivateAttempts = 3;
                while (activateAttempts < maxActivateAttempts) {
                  activateAttempts++;
                  try {
                    await window.walletManager.activate({
                      walletId: walletToAdd.walletId,
                      accountIndex: walletToAdd.accounts[0].accountIndex,
                      chainId: { networkId: 0, networkMagic: 1 }
                    });
                    status.activated = true;
                    break;
                  } catch (activateError) {
                    if (activateError.message && activateError.message.includes('not found') && activateAttempts < maxActivateAttempts) {
                      console.log('[addAndActivateWalletInRepository] Wallet not found, waiting and retrying activation...');
                      await new Promise(resolve => setTimeout(resolve, 500));
                    } else {
                      throw activateError;
                    }
                  }
                }
              } catch (e) {
                status.error = e.message;
              }
              return status;
            })()
          `
        );

        lastStatus = result;

        // Check for crash in result
        if (result?.hasCrash || result?.error === 'CRASH_DETECTED') {
          Logger.error(`[addAndActivateWalletInRepository] CRASH DETECTED in app!`);
          throw new Error('App crashed - crash screen detected');
        }

        // Detect setup page
        if (result?.isOnSetupPage) {
          onSetupPage = true;
        }

        // After 5 seconds on setup page, fail fast
        if (onSetupPage && Date.now() - startTime > 5000) {
          Logger.error(`[addAndActivateWalletInRepository] SETUP PAGE DETECTED - No wallet exists!`);
          Logger.error(`[addAndActivateWalletInRepository] Current path: ${result?.currentPath}`);
          throw new Error(
            `Cannot add wallet - app is on setup page (${result?.currentPath}). ` +
            `Wallet APIs are not available until a wallet is created through the onboarding UI.`
          );
        }

        if (attempts === 1 || attempts % 5 === 0 || result?.activated) {
          Logger.log(
            `[addAndActivateWalletInRepository] Attempt ${attempts} (${Date.now() - startTime}ms): ${JSON.stringify(result)}`
          );
        }

        return result && result.activated;
      } catch (e: any) {
        // Re-throw crash and setup page errors immediately
        if (e.message?.includes('crash') || e.message?.includes('CRASH') || e.message?.includes('setup page')) {
          throw e;
        }
        lastStatus = { executeError: String(e) };
        if (attempts === 1 || attempts % 5 === 0) {
          Logger.log(`[addAndActivateWalletInRepository] Attempt ${attempts} failed: ${e}`);
        }
        return false;
      }
    },
    {
      timeout: 15000,
      interval: 500,
      timeoutMsg: `walletRepository/walletManager add+activate failed after 15 seconds. Last status: ${JSON.stringify(lastStatus)}`
    }
  );

  Logger.log(`[addAndActivateWalletInRepository] Wallet added and activated after ${Date.now() - startTime}ms`);
};

export const addAndActivateWalletsInRepository = async (wallets: TestWalletName[]): Promise<void> => {
  const walletsRepositoryArray = wallets.map((wallet) => getTestWallet(wallet).repository as string);

  for (const wallet of walletsRepositoryArray.slice(1).reverse()) {
    await addWalletInRepository(wallet);
  }
  await addAndActivateWalletInRepository(walletsRepositoryArray[0]);
};
