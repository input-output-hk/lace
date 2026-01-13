import { browser } from '@wdio/globals';
import { Logger } from '../support/logger';
import { switchToWindowWithLace } from '../utils/window';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';

export const getNumWalletsInRepository = async (): Promise<number> => {
  // Wait for walletRepository API to be functional (not just the proxy to exist)
  // In bundle mode, the service worker may not have exposed the API yet
  const startTime = Date.now();
  const currentUrl = await browser.getUrl();
  const windowTitle = await browser.getTitle();
  
  Logger.log(`[getNumWalletsInRepository] START - URL: ${currentUrl}, Title: ${windowTitle}`);
  
  let attempts = 0;
  let lastStatus: any = null;
  
  try {
    await browser.waitUntil(
      async () => {
        attempts++;
        try {
          const result = await browser.execute(`
            return (async () => {
              const status = {
                hasWalletRepository: typeof window.walletRepository !== 'undefined',
                hasFirstValueFrom: typeof window.firstValueFrom !== 'undefined',
                hasWalletManager: typeof window.walletManager !== 'undefined',
                documentReady: document.readyState,
                windowLocation: window.location.href,
                ready: false,
                error: null
              };
              
              if (!status.hasWalletRepository || !status.hasFirstValueFrom) {
                return status;
              }
              
              try {
                // Actually test that the API works, not just that the proxy exists
                const wallets = await window.firstValueFrom(window.walletRepository.wallets$);
                status.ready = true;
                status.walletCount = wallets.length;
              } catch (e) {
                status.error = e.message;
                status.errorStack = e.stack?.split('\\n').slice(0, 3).join(' | ');
              }
              return status;
            })()
          `);
          
          lastStatus = result;
          
          // Log first attempt, every 5th, and when ready
          if (attempts === 1 || attempts % 5 === 0 || result?.ready) {
            Logger.log(`[getNumWalletsInRepository] Attempt ${attempts} (${Date.now() - startTime}ms): ${JSON.stringify(result)}`);
          }
          
          return result && result.ready;
        } catch (e) {
          lastStatus = { executeError: String(e) };
          if (attempts === 1 || attempts % 5 === 0) {
            Logger.log(`[getNumWalletsInRepository] Attempt ${attempts} execute failed: ${e}`);
          }
          return false;
        }
      },
      {
        timeout: 30000,
        interval: 500,
        timeoutMsg: `walletRepository API not functional after 30 seconds. Last status: ${JSON.stringify(lastStatus)}`
      }
    );

    Logger.log(`[getNumWalletsInRepository] SUCCESS after ${Date.now() - startTime}ms and ${attempts} attempts`);

    return await browser.execute(`
      return (async () => {
        const wallets = await window.firstValueFrom(window.walletRepository.wallets$);
        return wallets.length;
      })()
    `);
  } catch (e) {
    Logger.error(`[getNumWalletsInRepository] FAILED after ${Date.now() - startTime}ms and ${attempts} attempts`);
    Logger.error(`[getNumWalletsInRepository] Last status: ${JSON.stringify(lastStatus)}`);
    Logger.error(`[getNumWalletsInRepository] URL: ${currentUrl}, Title: ${windowTitle}`);
    throw e;
  }
};

export const clearWalletRepository = async (): Promise<void> => {
  const startTime = Date.now();
  Logger.log('[clearWalletRepository] START - Removing wallets');
  await switchToWindowWithLace(0);
  
  const currentUrl = await browser.getUrl();
  const windowTitle = await browser.getTitle();
  Logger.log(`[clearWalletRepository] Switched to Lace - URL: ${currentUrl}, Title: ${windowTitle}`);

  let attempts = 0;
  let lastStatus: any = null;
  
  // Wait for walletRepository API to be functional (including removeWallet and walletManager.deactivate methods)
  try {
    await browser.waitUntil(
      async () => {
        attempts++;
        try {
          const result = await browser.execute(`
            return (async () => {
              const status = {
                hasWalletRepository: typeof window.walletRepository !== 'undefined',
                hasWalletManager: typeof window.walletManager !== 'undefined',
                hasFirstValueFrom: typeof window.firstValueFrom !== 'undefined',
                hasRemoveWallet: typeof window.walletRepository?.removeWallet === 'function',
                hasDeactivate: typeof window.walletManager?.deactivate === 'function',
                documentReady: document.readyState,
                ready: false,
                error: null
              };
              
              if (!status.hasWalletRepository || !status.hasWalletManager || !status.hasFirstValueFrom ||
                  !status.hasRemoveWallet || !status.hasDeactivate) {
                return status;
              }
              
              try {
                await window.firstValueFrom(window.walletRepository.wallets$);
                status.ready = true;
              } catch (e) {
                status.error = e.message;
              }
              return status;
            })()
          `);
          
          lastStatus = result;
          
          if (attempts === 1 || attempts % 5 === 0 || result?.ready) {
            Logger.log(`[clearWalletRepository] Attempt ${attempts} (${Date.now() - startTime}ms): ${JSON.stringify(result)}`);
          }
          
          return result && result.ready;
        } catch (e) {
          lastStatus = { executeError: String(e) };
          if (attempts === 1 || attempts % 5 === 0) {
            Logger.log(`[clearWalletRepository] Attempt ${attempts} failed: ${e}`);
          }
          return false;
        }
      },
      {
        timeout: 30000,
        interval: 500,
        timeoutMsg: `walletRepository API not functional after 30 seconds. Last status: ${JSON.stringify(lastStatus)}`
      }
    );

    Logger.log(`[clearWalletRepository] API ready after ${Date.now() - startTime}ms`);

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
    
    Logger.log(`[clearWalletRepository] SUCCESS - completed in ${Date.now() - startTime}ms`);
  } catch (e) {
    Logger.error(`[clearWalletRepository] FAILED after ${Date.now() - startTime}ms`);
    Logger.error(`[clearWalletRepository] Last status: ${JSON.stringify(lastStatus)}`);
    Logger.error(`[clearWalletRepository] URL: ${currentUrl}, Title: ${windowTitle}`);
    throw e;
  }
};

export const getWalletsFromRepository = async (): Promise<any[]> => {
  // Wait for walletRepository API to be functional
  await browser.waitUntil(
    async () => {
      try {
        const result = await browser.execute(`
          return (async () => {
            if (typeof window.walletRepository === 'undefined' || 
                typeof window.firstValueFrom === 'undefined') {
              return { ready: false };
            }
            try {
              await window.firstValueFrom(window.walletRepository.wallets$);
              return { ready: true };
            } catch (e) {
              return { ready: false };
            }
          })()
        `);
        return result && result.ready;
      } catch {
        return false;
      }
    },
    {
      timeout: 30000,
      timeoutMsg: 'walletRepository API not functional after 30 seconds'
    }
  );

  return await browser.execute(`
      const wallets = await window.firstValueFrom(window.walletRepository.wallets$);
      return wallets;
  `);
};

const addWalletInRepository = async (wallet: string): Promise<void> => {
  const startTime = Date.now();
  let attempts = 0;
  let lastStatus: any = null;

  // Wait for walletRepository API to be fully functional (including addWallet method)
  await browser.waitUntil(
    async () => {
      attempts++;
      try {
        const result = await browser.execute(`
          return (async () => {
            const status = {
              hasWalletRepository: typeof window.walletRepository !== 'undefined',
              hasFirstValueFrom: typeof window.firstValueFrom !== 'undefined',
              hasAddWallet: typeof window.walletRepository?.addWallet === 'function',
              ready: false,
              error: null
            };
            
            if (!status.hasWalletRepository || !status.hasFirstValueFrom || !status.hasAddWallet) {
              return status;
            }
            
            try {
              await window.firstValueFrom(window.walletRepository.wallets$);
              status.ready = true;
            } catch (e) {
              status.error = e.message;
            }
            return status;
          })()
        `);
        
        lastStatus = result;
        
        if (attempts === 1 || attempts % 5 === 0 || result?.ready) {
          Logger.log(`[addWalletInRepository] Attempt ${attempts} (${Date.now() - startTime}ms): ${JSON.stringify(result)}`);
        }
        
        return result && result.ready;
      } catch (e) {
        lastStatus = { executeError: String(e) };
        if (attempts === 1 || attempts % 5 === 0) {
          Logger.log(`[addWalletInRepository] Attempt ${attempts} failed: ${e}`);
        }
        return false;
      }
    },
    {
      timeout: 30000,
      interval: 500,
      timeoutMsg: `walletRepository.addWallet API not functional after 30 seconds. Last status: ${JSON.stringify(lastStatus)}`
    }
  );

  Logger.log(`[addWalletInRepository] API ready after ${Date.now() - startTime}ms`);

  await browser.execute(
    `
      return (async () => {
        let walletsObj = JSON.parse('${wallet}');
        await window.walletRepository.addWallet(walletsObj[0]);
      })()
    `
  );
};

export const addAndActivateWalletInRepository = async (wallet: string): Promise<void> => {
  const startTime = Date.now();
  let attempts = 0;
  let lastStatus: any = null;

  // Wait for walletRepository API to be fully functional (including addWallet method and walletManager.activate)
  await browser.waitUntil(
    async () => {
      attempts++;
      try {
        const result = await browser.execute(`
          return (async () => {
            const status = {
              hasWalletRepository: typeof window.walletRepository !== 'undefined',
              hasWalletManager: typeof window.walletManager !== 'undefined',
              hasFirstValueFrom: typeof window.firstValueFrom !== 'undefined',
              hasAddWallet: typeof window.walletRepository?.addWallet === 'function',
              hasActivate: typeof window.walletManager?.activate === 'function',
              ready: false,
              error: null
            };
            
            if (!status.hasWalletRepository || !status.hasWalletManager || 
                !status.hasFirstValueFrom || !status.hasAddWallet || !status.hasActivate) {
              return status;
            }
            
            try {
              await window.firstValueFrom(window.walletRepository.wallets$);
              status.ready = true;
            } catch (e) {
              status.error = e.message;
            }
            return status;
          })()
        `);
        
        lastStatus = result;
        
        if (attempts === 1 || attempts % 5 === 0 || result?.ready) {
          Logger.log(`[addAndActivateWalletInRepository] Attempt ${attempts} (${Date.now() - startTime}ms): ${JSON.stringify(result)}`);
        }
        
        return result && result.ready;
      } catch (e) {
        lastStatus = { executeError: String(e) };
        if (attempts === 1 || attempts % 5 === 0) {
          Logger.log(`[addAndActivateWalletInRepository] Attempt ${attempts} failed: ${e}`);
        }
        return false;
      }
    },
    {
      timeout: 30000,
      interval: 500,
      timeoutMsg: `walletRepository/walletManager API not functional after 30 seconds. Last status: ${JSON.stringify(lastStatus)}`
    }
  );

  Logger.log(`[addAndActivateWalletInRepository] API ready after ${Date.now() - startTime}ms`);

  await browser.execute(
    `
      return (async () => {
        let walletsObj = JSON.parse('${wallet}');
        await window.walletRepository.addWallet(walletsObj[0]);
        // wait for Lace to auto-activate the added wallet,
        // which might use a different network than we want to set here
        // this is still a race and we should rework wallet initialization
        await new Promise(resolve => setTimeout(resolve, 1000));
        await window.walletManager.activate({
          walletId: walletsObj[0].walletId,
          accountIndex: walletsObj[0].accounts[0].accountIndex,
          chainId: { networkId: 0, networkMagic: 1 }
        });
      })()
    `
  );
};

export const addAndActivateWalletsInRepository = async (wallets: TestWalletName[]): Promise<void> => {
  const walletsRepositoryArray = wallets.map((wallet) => getTestWallet(wallet).repository as string);

  for (const wallet of walletsRepositoryArray.slice(1).reverse()) {
    await addWalletInRepository(wallet);
  }
  await addAndActivateWalletInRepository(walletsRepositoryArray[0]);
};
