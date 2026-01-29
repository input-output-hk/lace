import { browser } from '@wdio/globals';
import { Logger } from '../support/logger';

export interface Page {
  visit(): void;
}

const CRASH_SCREEN_SELECTOR = '[data-testid="crash-reload"]';

export abstract class LaceView {
  abstract getBaseUrl(): Promise<string>;

  /**
   * Wait for wallet APIs to be available in the page context.
   */
  async waitForWalletAPIs(timeoutMs: number = 10000): Promise<void> {
    const startTime = Date.now();

    await browser.waitUntil(
      async () => {
        try {
          const status = await browser.execute(() => {
            return {
              hasWalletRepository: typeof (window as any).walletRepository !== 'undefined',
              hasWalletManager: typeof (window as any).walletManager !== 'undefined',
              hasFirstValueFrom: typeof (window as any).firstValueFrom !== 'undefined',
              hasAddWallet: typeof (window as any).walletRepository?.addWallet === 'function',
              hasActivate: typeof (window as any).walletManager?.activate === 'function'
            };
          });

          const ready = status.hasWalletRepository && status.hasWalletManager && 
                       status.hasFirstValueFrom && status.hasAddWallet && status.hasActivate;
          
          if (ready) {
            Logger.log(`[waitForWalletAPIs] SUCCESS after ${Date.now() - startTime}ms`);
          }

          return ready;
        } catch {
          return false;
        }
      },
      {
        timeout: timeoutMs,
        interval: 300,
        timeoutMsg: `Wallet APIs not available after ${timeoutMs}ms`
      }
    );
  }

  async waitForPreloaderToDisappear(): Promise<void> {
    const startTime = Date.now();
    
    await browser.waitUntil(
      async () => {
        // Check for crash
        const crashExists = await $(CRASH_SCREEN_SELECTOR).isExisting();
        if (crashExists) {
          throw new Error('App crashed during load. Crash screen detected.');
        }
        
        const preloaderExists = await $('#preloader').isExisting();
        
        if (!preloaderExists) {
          // Verify app has content before returning
          const hasAppContent = await browser.execute(() => {
            const laceApp = document.querySelector('#lace-app');
            return laceApp && laceApp.children.length > 0;
          });
          
          if (hasAppContent) {
            Logger.log(`[waitForPreloaderToDisappear] Complete after ${Date.now() - startTime}ms`);
            return true;
          }
        }
        
        return false;
      },
      { timeout: 5 * 60 * 1000, interval: 500 }
    );
  }

  /**
   * Verifies browser navigated to extension page and React mounted.
   * Detects bfcache issues and forces reload if needed.
   */
  async waitForExtensionPage(targetUrl: string): Promise<void> {
    const startTime = Date.now();
    let navAttempts = 0;
    const maxNavAttempts = 2;
    let bfcacheRefreshDone = false;

    await browser.waitUntil(
      async () => {
        const elapsed = Date.now() - startTime;
        
        const status = await browser.execute(() => {
          const crashElement = document.querySelector('[data-testid="crash-reload"]');
          const laceAppElement = document.querySelector('#lace-app');
          return {
            url: window.location.href,
            isExtensionPage: window.location.protocol === 'chrome-extension:' || window.location.protocol === 'moz-extension:',
            readyState: document.readyState,
            hasCrash: !!crashElement,
            laceAppChildCount: laceAppElement?.children?.length || 0
          };
        });

        if (status.hasCrash) {
          throw new Error(`App crashed during navigation. URL: ${status.url}`);
        }

        // Success: on extension page, document loaded, React mounted
        if (status.isExtensionPage && status.readyState === 'complete' && status.laceAppChildCount > 0) {
          Logger.log(`[waitForExtensionPage] SUCCESS after ${elapsed}ms - URL: ${status.url}`);
          return true;
        }

        // Detect bfcache issue: on extension page, document "complete", but React not mounted
        // This happens after reloadSession() when browser restores from cache without re-executing scripts
        if (status.isExtensionPage && status.readyState === 'complete' && 
            status.laceAppChildCount === 0 && !bfcacheRefreshDone && elapsed > 2000) {
          bfcacheRefreshDone = true;
          Logger.warn(`[waitForExtensionPage] Potential bfcache issue - forcing reload`);
          await browser.execute(() => window.location.reload());
          await browser.pause(1000);
          return false;
        }

        // Not on extension page - retry navigation
        if (!status.isExtensionPage) {
          navAttempts++;
          if (navAttempts <= maxNavAttempts) {
            Logger.log(`[waitForExtensionPage] Retrying navigation to ${targetUrl}...`);
            await browser.url(targetUrl);
            await browser.pause(500);
          } else {
            throw new Error(`Failed to navigate to extension page after ${navAttempts} attempts. Stuck on: ${status.url}`);
          }
        }

        return false;
      },
      {
        timeout: 10000,
        interval: 500,
        timeoutMsg: 'Extension page did not load within 10s'
      }
    );
  }
}
