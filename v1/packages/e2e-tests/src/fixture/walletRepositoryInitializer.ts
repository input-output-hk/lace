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
 * Check service worker status - both bundle loading and wallet API readiness.
 * Returns detailed status for fast-fail diagnostics.
 */
const checkServiceWorkerStatus = async (): Promise<{
  bundleReady: boolean;
  v1Loaded: boolean;
  v2Loaded: boolean;
  v1Error: string | null;
  v2Error: string | null;
  walletApiReady: boolean;
  walletManagerReady: boolean;
  walletManagerError: string | null;
  hasWalletRepository: boolean;
  hasWalletManager: boolean;
  hasFirstValueFrom: boolean;
  unhandledErrors: any[];
  error: string | null;
}> => {
  try {
    const result = await browser.execute(() => {
      const status = {
        bundleReady: false,
        v1Loaded: false,
        v2Loaded: false,
        v1Error: null as string | null,
        v2Error: null as string | null,
        walletApiReady: false,
        walletManagerReady: false,
        walletManagerError: null as string | null,
        hasWalletRepository: false,
        hasWalletManager: false,
        hasFirstValueFrom: false,
        unhandledErrors: [] as any[],
        error: null as string | null
      };

      // Check bundle state (set by sw-bundle.js)
      const swState = (globalThis as any).SW_BUNDLE_STATE;
      if (swState) {
        status.bundleReady = swState.ready === true;
        status.v1Loaded = swState.v1Loaded === true;
        status.v2Loaded = swState.v2Loaded === true;
        status.v1Error = swState.v1Error || null;
        status.v2Error = swState.v2Error || null;
        // Get any unhandled errors from SW
        status.unhandledErrors = swState.unhandledErrors || [];
      }

      // Check wallet manager ready state (set by wallet.ts after initialize())
      status.walletManagerReady = (globalThis as any).WALLET_MANAGER_READY === true;
      status.walletManagerError = (globalThis as any).WALLET_MANAGER_ERROR || null;

      // Check if wallet APIs are exposed to window
      status.hasWalletRepository = typeof (window as any).walletRepository !== 'undefined';
      status.hasWalletManager = typeof (window as any).walletManager !== 'undefined';
      status.hasFirstValueFrom = typeof (window as any).firstValueFrom !== 'undefined';

      // Check if wallet API is actually functional (not just proxy)
      if (status.hasWalletRepository && status.hasWalletManager && status.hasFirstValueFrom) {
        try {
          const walletRepo = (window as any).walletRepository;
          if (walletRepo && typeof walletRepo.wallets$ !== 'undefined') {
            status.walletApiReady = true;
          }
        } catch (e: any) {
          status.error = e.message;
        }
      }

      return status;
    });

    return result;
  } catch (e: any) {
    return {
      bundleReady: false,
      v1Loaded: false,
      v2Loaded: false,
      v1Error: null,
      v2Error: null,
      walletApiReady: false,
      walletManagerReady: false,
      walletManagerError: null,
      hasWalletRepository: false,
      hasWalletManager: false,
      hasFirstValueFrom: false,
      unhandledErrors: [],
      error: `Failed to check SW status: ${e.message}`
    };
  }
};

/**
 * Wait for service workers to be fully ready. Fails fast on errors.
 * Short timeout (10s) - if SWs aren't ready by then, something is wrong.
 */
const waitForServiceWorkerReady = async (context: string, timeoutMs: number = 10000): Promise<void> => {
  const startTime = Date.now();
  let lastStatus: any = null;
  let attempts = 0;

  Logger.log(`[${context}] ========================================`);
  Logger.log(`[${context}] Checking service worker status (timeout: ${timeoutMs}ms)`);

  while (Date.now() - startTime < timeoutMs) {
    attempts++;
    
    // Check for app crash first
    await checkForCrashAndThrow(context);
    
    const status = await checkServiceWorkerStatus();
    lastStatus = status;

    // FAIL FAST: Check for unhandled errors in service workers
    if (status.unhandledErrors && status.unhandledErrors.length > 0) {
      Logger.error(`[${context}] ========================================`);
      Logger.error(`[${context}] SERVICE WORKER UNHANDLED ERRORS DETECTED!`);
      for (const err of status.unhandledErrors) {
        Logger.error(`[${context}] ${err.type}: ${err.message || err.reason}`);
        if (err.source) Logger.error(`[${context}]   Source: ${err.source}:${err.line}`);
        if (err.stack) Logger.error(`[${context}]   Stack: ${err.stack}`);
      }
      Logger.error(`[${context}] ========================================`);
      throw new Error(`Service worker has ${status.unhandledErrors.length} unhandled error(s): ${status.unhandledErrors[0]?.message || status.unhandledErrors[0]?.reason}`);
    }

    // FAIL FAST: Check for service worker load errors
    if (status.v1Error) {
      Logger.error(`[${context}] V1 SERVICE WORKER CRASHED: ${status.v1Error}`);
      throw new Error(`V1 (Lace) service worker failed to load: ${status.v1Error}`);
    }
    if (status.v2Error) {
      Logger.error(`[${context}] V2 SERVICE WORKER CRASHED: ${status.v2Error}`);
      throw new Error(`V2 (Midnight) service worker failed to load: ${status.v2Error}`);
    }
    if (status.walletManagerError) {
      Logger.error(`[${context}] WALLET MANAGER ERROR: ${status.walletManagerError}`);
      throw new Error(`Wallet manager initialization failed: ${status.walletManagerError}`);
    }
    if (status.error) {
      Logger.error(`[${context}] ERROR: ${status.error}`);
      throw new Error(`Service worker error: ${status.error}`);
    }

    // Log detailed status on first attempt and every 2 seconds
    if (attempts === 1 || (Date.now() - startTime) % 2000 < 300) {
      Logger.log(`[${context}] SW Status (${Date.now() - startTime}ms): ` +
        `bundle=${status.bundleReady}, v1=${status.v1Loaded}, v2=${status.v2Loaded}, ` +
        `walletMgrReady=${status.walletManagerReady}, walletApiReady=${status.walletApiReady}`);
    }

    // SUCCESS: All systems ready
    if (status.bundleReady && status.walletManagerReady && status.walletApiReady) {
      Logger.log(`[${context}] ✓ Service workers ready after ${Date.now() - startTime}ms`);
      Logger.log(`[${context}] ========================================`);
      return;
    }

    await browser.pause(300);
  }

  // Timeout - provide detailed diagnostics
  Logger.error(`[${context}] ========================================`);
  Logger.error(`[${context}] SERVICE WORKER TIMEOUT after ${timeoutMs}ms`);
  Logger.error(`[${context}] Last status: ${JSON.stringify(lastStatus, null, 2)}`);
  
  // Log any unhandled errors even on timeout
  if (lastStatus?.unhandledErrors?.length > 0) {
    Logger.error(`[${context}] UNHANDLED ERRORS:`);
    for (const err of lastStatus.unhandledErrors) {
      Logger.error(`[${context}]   ${err.type}: ${err.message || err.reason}`);
    }
  }
  Logger.error(`[${context}] ========================================`);
  
  // Provide specific failure reason
  let failureReason = 'Unknown';
  if (!lastStatus?.v1Loaded) failureReason = 'V1 (Lace) service worker not loaded';
  else if (!lastStatus?.v2Loaded) failureReason = 'V2 (Midnight) service worker not loaded';
  else if (!lastStatus?.bundleReady) failureReason = 'Bundle not ready';
  else if (!lastStatus?.walletManagerReady) failureReason = 'Wallet manager not initialized - check SW logs for errors';
  else if (!lastStatus?.walletApiReady) failureReason = 'Wallet API not functional - proxy exists but API not exposed';

  throw new Error(
    `Service worker not ready after ${timeoutMs}ms. Reason: ${failureReason}. ` +
    `Status: v1=${lastStatus?.v1Loaded}, v2=${lastStatus?.v2Loaded}, ` +
    `walletMgrReady=${lastStatus?.walletManagerReady}, walletApiReady=${lastStatus?.walletApiReady}`
  );
};

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
        timeout: 15000,
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
        timeout: 15000,
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
      timeout: 15000,
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
  let onSetupPage = false;

  // First, wait for service worker to be ready (fast-fail if crashed)
  await waitForServiceWorkerReady('addWalletInRepository', 15000);

  // Wait for walletRepository API AND add wallet in a single browser.execute to avoid race conditions
  await browser.waitUntil(
    async () => {
      attempts++;
      try {
        const result = await browser.execute(`
          return (async () => {
            const walletData = '${wallet}';
            const currentPath = window.location.hash;
            const isOnSetupPage = currentPath.includes('/setup');
            
            const status = {
              hasWalletRepository: typeof window.walletRepository !== 'undefined',
              hasFirstValueFrom: typeof window.firstValueFrom !== 'undefined',
              hasAddWallet: typeof window.walletRepository?.addWallet === 'function',
              isOnSetupPage,
              currentPath,
              ready: false,
              added: false,
              error: null
            };
            
            if (!status.hasWalletRepository || !status.hasFirstValueFrom || !status.hasAddWallet) {
              return status;
            }
            
            try {
              // Verify API is functional
              await window.firstValueFrom(window.walletRepository.wallets$);
              status.ready = true;
              
              // Add wallet in same execution context to avoid race condition
              const walletsObj = JSON.parse(walletData);
              await window.walletRepository.addWallet(walletsObj[0]);
              status.added = true;
            } catch (e) {
              status.error = e.message;
            }
            return status;
          })()
        `);
        
        lastStatus = result;
        
        // Detect setup page - wallet APIs won't be available there
        if (result?.isOnSetupPage) {
          onSetupPage = true;
        }
        
        // After 5 seconds on setup page, fail fast with clear message
        if (onSetupPage && (Date.now() - startTime) > 5000) {
          Logger.error(`[addWalletInRepository] SETUP PAGE DETECTED - No wallet exists!`);
          Logger.error(`[addWalletInRepository] Current path: ${result?.currentPath}`);
          throw new Error(
            `Cannot add wallet - app is on setup page (${result?.currentPath}). ` +
            `Wallet APIs are not available until a wallet is created through the onboarding UI.`
          );
        }
        
        if (attempts === 1 || attempts % 5 === 0 || result?.added) {
          Logger.log(`[addWalletInRepository] Attempt ${attempts} (${Date.now() - startTime}ms): ${JSON.stringify(result)}`);
        }
        
        return result && result.added;
      } catch (e: any) {
        // Re-throw setup page errors immediately
        if (e.message?.includes('setup page')) {
          throw e;
        }
        lastStatus = { executeError: String(e) };
        if (attempts === 1 || attempts % 5 === 0) {
          Logger.log(`[addWalletInRepository] Attempt ${attempts} failed: ${e}`);
        }
        return false;
      }
    },
    {
      timeout: 15000,
      interval: 500,
      timeoutMsg: `walletRepository.addWallet failed after 30 seconds. Last status: ${JSON.stringify(lastStatus)}`
    }
  );

  Logger.log(`[addWalletInRepository] Wallet added after ${Date.now() - startTime}ms`);
};

export const addAndActivateWalletInRepository = async (wallet: string): Promise<void> => {
  const startTime = Date.now();
  let attempts = 0;
  let lastStatus: any = null;
  let onSetupPage = false;

  // First, wait for service worker to be ready (fast-fail if crashed)
  await waitForServiceWorkerReady('addAndActivateWalletInRepository', 15000);

  // Wait for walletRepository API AND add+activate wallet in a single browser.execute to avoid race conditions
  await browser.waitUntil(
    async () => {
      attempts++;
      try {
        // Check for crash first - fail fast
        await checkForCrashAndThrow('addAndActivateWalletInRepository');
        
        const result = await browser.execute(`
          return (async () => {
            const walletData = '${wallet}';
            const currentPath = window.location.hash;
            const isOnSetupPage = currentPath.includes('/setup');
            
            const status = {
              hasWalletRepository: typeof window.walletRepository !== 'undefined',
              hasWalletManager: typeof window.walletManager !== 'undefined',
              hasFirstValueFrom: typeof window.firstValueFrom !== 'undefined',
              hasAddWallet: typeof window.walletRepository?.addWallet === 'function',
              hasActivate: typeof window.walletManager?.activate === 'function',
              hasCrash: !!document.querySelector('[data-testid="crash-reload"]'),
              isOnSetupPage,
              currentPath,
              ready: false,
              added: false,
              activated: false,
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
              await window.firstValueFrom(window.walletRepository.wallets$);
              status.ready = true;
              
              // Add wallet in same execution context to avoid race condition
              const walletsObj = JSON.parse(walletData);
              await window.walletRepository.addWallet(walletsObj[0]);
              status.added = true;
              
              // Wait for Lace to auto-activate the added wallet
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Activate with desired network
              await window.walletManager.activate({
                walletId: walletsObj[0].walletId,
                accountIndex: walletsObj[0].accounts[0].accountIndex,
                chainId: { networkId: 0, networkMagic: 1 }
              });
              status.activated = true;
            } catch (e) {
              status.error = e.message;
            }
            return status;
          })()
        `);
        
        lastStatus = result;
        
        // Check for crash in result
        if (result?.hasCrash || result?.error === 'CRASH_DETECTED') {
          Logger.error(`[addAndActivateWalletInRepository] CRASH DETECTED in app!`);
          throw new Error('App crashed - crash screen detected');
        }
        
        // Detect setup page - wallet APIs won't be available there
        if (result?.isOnSetupPage) {
          onSetupPage = true;
        }
        
        // After 5 seconds on setup page, fail fast with clear message
        if (onSetupPage && (Date.now() - startTime) > 5000) {
          Logger.error(`[addAndActivateWalletInRepository] SETUP PAGE DETECTED - No wallet exists!`);
          Logger.error(`[addAndActivateWalletInRepository] Current path: ${result?.currentPath}`);
          Logger.error(`[addAndActivateWalletInRepository] Wallet APIs are only available after a wallet is created through the onboarding flow.`);
          Logger.error(`[addAndActivateWalletInRepository] This test expects a wallet to exist. Possible causes:`);
          Logger.error(`  1. Browser session was not properly preserved from previous test`);
          Logger.error(`  2. Test ordering issue - this test should run after wallet creation tests`);
          Logger.error(`  3. Browser was reset/reloaded losing wallet data`);
          throw new Error(
            `Cannot add wallet - app is on setup page (${result?.currentPath}). ` +
            `Wallet APIs are not available until a wallet is created through the onboarding UI. ` +
            `This test requires a wallet to already exist.`
          );
        }
        
        if (attempts === 1 || attempts % 5 === 0 || result?.activated) {
          Logger.log(`[addAndActivateWalletInRepository] Attempt ${attempts} (${Date.now() - startTime}ms): ${JSON.stringify(result)}`);
        }
        
        return result && result.activated;
      } catch (e: any) {
        // Re-throw crash errors and setup page errors immediately
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
      timeoutMsg: `walletRepository/walletManager add+activate failed after 30 seconds. Last status: ${JSON.stringify(lastStatus)}`
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
