import { browser } from '@wdio/globals';
import { Logger } from '../support/logger';

export interface Page {
  visit(): void;
}

// Crash screen selector from CrashScreen.ts
const CRASH_SCREEN_SELECTOR = '[data-testid="crash-reload"]';

export abstract class LaceView {
  abstract getBaseUrl(): Promise<string>;

  /**
   * Wait for wallet APIs to be available in the page context.
   * These APIs (walletRepository, walletManager, firstValueFrom) are exposed by wallet-api-ui.ts
   * which is imported by DataCheckContainer when the main app routes mount.
   * 
   * On a fresh session, the app may redirect to /setup, but the APIs should still be available
   * once the React app fully initializes - we just need to wait for them.
   */
  async waitForWalletAPIs(timeoutMs: number = 30000): Promise<void> {
    const startTime = Date.now();
    let attempts = 0;
    let lastStatus: any = null;

    Logger.log(`[waitForWalletAPIs] START - waiting for wallet APIs to be exposed (timeout: ${timeoutMs}ms)`);

    await browser.waitUntil(
      async () => {
        attempts++;
        try {
          const status = await browser.execute(() => {
            return {
              hasWalletRepository: typeof (window as any).walletRepository !== 'undefined',
              hasWalletManager: typeof (window as any).walletManager !== 'undefined',
              hasFirstValueFrom: typeof (window as any).firstValueFrom !== 'undefined',
              hasAddWallet: typeof (window as any).walletRepository?.addWallet === 'function',
              hasActivate: typeof (window as any).walletManager?.activate === 'function',
              currentPath: window.location.hash,
              documentReady: document.readyState
            };
          });

          lastStatus = status;

          // Log progress periodically
          if (attempts === 1 || (Date.now() - startTime) % 3000 < 500) {
            Logger.log(`[waitForWalletAPIs] Attempt ${attempts} (${Date.now() - startTime}ms): ${JSON.stringify(status)}`);
          }

          // Success: all APIs are available and functional
          const ready = status.hasWalletRepository && status.hasWalletManager && 
                       status.hasFirstValueFrom && status.hasAddWallet && status.hasActivate;
          
          if (ready) {
            Logger.log(`[waitForWalletAPIs] SUCCESS after ${Date.now() - startTime}ms - APIs available at path: ${status.currentPath}`);
          }

          return ready;
        } catch (e: any) {
          lastStatus = { error: e.message };
          return false;
        }
      },
      {
        timeout: timeoutMs,
        interval: 300,
        timeoutMsg: `Wallet APIs not available after ${timeoutMs}ms. Last status: ${JSON.stringify(lastStatus)}. ` +
          `This may indicate the React app didn't fully initialize or wallet-api-ui.ts wasn't loaded.`
      }
    );
  }

  /**
   * Checks for app errors/crashes and returns diagnostic info
   */
  private async checkForAppErrors(): Promise<{ hasCrash: boolean; consoleErrors: string[] }> {
    const result = await browser.execute(() => {
      const crashElement = document.querySelector('[data-testid="crash-reload"]');
      // Collect any visible error messages in the DOM
      const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"], [data-testid*="error"]');
      const errorTexts = Array.from(errorElements).map(el => el.textContent?.trim()).filter(Boolean);
      return {
        hasCrash: !!crashElement,
        visibleErrors: errorTexts.slice(0, 5) // Limit to first 5
      };
    });
    
    return {
      hasCrash: result.hasCrash,
      consoleErrors: result.visibleErrors as string[]
    };
  }

  async waitForPreloaderToDisappear(): Promise<void> {
    const startTime = Date.now();
    let sawPreloader = false;
    
    Logger.log(`[waitForPreloaderToDisappear] START`);
    
    await browser.waitUntil(
      async () => {
        // Check for crash first
        const crashExists = await $(CRASH_SCREEN_SELECTOR).isExisting();
        if (crashExists) {
          const errorInfo = await this.checkForAppErrors();
          Logger.error(`[waitForPreloaderToDisappear] CRASH DETECTED! Errors: ${JSON.stringify(errorInfo)}`);
          throw new Error(`App crashed during load. Crash screen detected.`);
        }
        
        const preloaderExists = await $('#preloader').isExisting();
        
        // Track if we ever saw the preloader (to detect false-positive early returns)
        if (preloaderExists) {
          sawPreloader = true;
        }
        
        // If preloader doesn't exist but we never saw it, check if app has content
        // This prevents returning true before app starts loading
        if (!preloaderExists && !sawPreloader) {
          const hasAppContent = await browser.execute(() => {
            // Lace app uses #lace-app, not #root
            const hasLaceApp = !!document.querySelector('#lace-app');
            const laceAppHasChildren = (document.querySelector('#lace-app')?.children?.length || 0) > 0;
            return hasLaceApp && laceAppHasChildren;
          });
          
          if (!hasAppContent) {
            if ((Date.now() - startTime) % 5000 < 500) {
              Logger.log(`[waitForPreloaderToDisappear] Waiting for app to start loading...`);
            }
            return false;
          }
        }
        
        if (!preloaderExists) {
          Logger.log(`[waitForPreloaderToDisappear] Complete after ${Date.now() - startTime}ms (sawPreloader: ${sawPreloader})`);
        }
        
        return !preloaderExists;
      },
      { timeout: 5 * 60 * 1000, interval: 500 }
    );
  }

  /**
   * Verifies browser navigated to extension page successfully and page is fully loaded.
   * Retries navigation if browser is still on non-extension page.
   * Refreshes page if React app doesn't mount within expected time.
   * Fails fast if crash is detected.
   */
  async waitForExtensionPage(targetUrl: string): Promise<void> {
    const startTime = Date.now();
    let navAttempts = 0;
    let refreshAttempts = 0;
    const maxNavAttempts = 3;
    const maxRefreshAttempts = 2;
    const REFRESH_AFTER_MS = 10000; // Refresh if laceAppChildren stays 0 for 10s
    let lastZeroChildrenTime = 0;

    Logger.log(`[waitForExtensionPage] START - target: ${targetUrl}`);

    await browser.waitUntil(
      async () => {
        try {
          const status = await browser.execute(() => {
            const crashElement = document.querySelector('[data-testid="crash-reload"]');
            // Lace app uses #lace-app, not #root
            const laceAppElement = document.querySelector('#lace-app');
            return {
              url: window.location.href,
              isExtensionPage: window.location.protocol === 'chrome-extension:' || window.location.protocol === 'moz-extension:',
              readyState: document.readyState,
              hasBody: !!document.body,
              bodyChildCount: document.body?.children?.length || 0,
              hasCrash: !!crashElement,
              hasLaceApp: !!laceAppElement,
              laceAppChildCount: laceAppElement?.children?.length || 0
            };
          });

          // Check for crash first - fail fast
          if (status.hasCrash) {
            Logger.error(`[waitForExtensionPage] CRASH DETECTED at ${status.url}`);
            throw new Error(`App crashed during navigation. URL: ${status.url}`);
          }

          // Check if on extension page AND document is loaded AND #lace-app has content
          if (status.isExtensionPage && status.readyState === 'complete' && status.laceAppChildCount > 0) {
            Logger.log(`[waitForExtensionPage] SUCCESS after ${Date.now() - startTime}ms - URL: ${status.url}, laceAppChildren: ${status.laceAppChildCount}`);
            return true;
          }

          // If not on extension page, retry navigation
          if (!status.isExtensionPage) {
            navAttempts++;
            Logger.warn(`[waitForExtensionPage] Attempt ${navAttempts} - Not on extension page. Current: ${status.url}, Expected: ${targetUrl}`);

            if (navAttempts <= maxNavAttempts) {
              Logger.log(`[waitForExtensionPage] Retrying navigation to ${targetUrl}...`);
              await browser.url(targetUrl);
              await browser.pause(1000);
              lastZeroChildrenTime = 0; // Reset refresh timer after navigation
            }
          } else {
            // On extension page but React hasn't mounted yet
            const elapsed = Date.now() - startTime;
            
            // Track how long laceAppChildren has been 0
            if (status.laceAppChildCount === 0) {
              if (lastZeroChildrenTime === 0) {
                lastZeroChildrenTime = Date.now();
              }
              
              const zeroChildrenDuration = Date.now() - lastZeroChildrenTime;
              
              // If React hasn't mounted for REFRESH_AFTER_MS, try refreshing
              if (zeroChildrenDuration > REFRESH_AFTER_MS && refreshAttempts < maxRefreshAttempts) {
                refreshAttempts++;
                Logger.warn(`[waitForExtensionPage] React not mounted after ${zeroChildrenDuration}ms, refreshing page (attempt ${refreshAttempts}/${maxRefreshAttempts})...`);
                await browser.refresh();
                await browser.pause(2000); // Wait for page to reload
                lastZeroChildrenTime = Date.now(); // Reset timer after refresh
              }
            } else {
              lastZeroChildrenTime = 0; // Reset if we see any children
            }
            
            // Log progress periodically
            if (elapsed % 3000 < 500) {
              Logger.log(`[waitForExtensionPage] Loading... readyState: ${status.readyState}, hasLaceApp: ${status.hasLaceApp}, laceAppChildren: ${status.laceAppChildCount}, elapsed: ${elapsed}ms`);
            }
          }

          return false;
        } catch (e: any) {
          // Re-throw crash errors
          if (e.message?.includes('crashed')) {
            throw e;
          }
          Logger.warn(`[waitForExtensionPage] Check failed: ${e}`);
          return false;
        }
      },
      {
        timeout: 60000, // Increased to 60s to allow for refresh retries
        interval: 500,
        timeoutMsg: `Failed to load extension page after ${navAttempts} nav attempts and ${refreshAttempts} refresh attempts. Target: ${targetUrl}`
      }
    );
  }
}
