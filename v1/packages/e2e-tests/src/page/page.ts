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
            const hasRoot = !!document.querySelector('#root');
            const rootHasChildren = (document.querySelector('#root')?.children?.length || 0) > 0;
            return hasRoot && rootHasChildren;
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
   * Fails fast if crash is detected.
   */
  async waitForExtensionPage(targetUrl: string): Promise<void> {
    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = 3;

    await browser.waitUntil(
      async () => {
        try {
          const status = await browser.execute(() => {
            const crashElement = document.querySelector('[data-testid="crash-reload"]');
            return {
              url: window.location.href,
              isExtensionPage: window.location.protocol === 'chrome-extension:' || window.location.protocol === 'moz-extension:',
              readyState: document.readyState,
              hasBody: !!document.body,
              bodyChildCount: document.body?.children?.length || 0,
              hasCrash: !!crashElement,
              hasRoot: !!document.querySelector('#root'),
              rootChildCount: document.querySelector('#root')?.children?.length || 0
            };
          });

          // Check for crash first - fail fast
          if (status.hasCrash) {
            Logger.error(`[waitForExtensionPage] CRASH DETECTED at ${status.url}`);
            throw new Error(`App crashed during navigation. URL: ${status.url}`);
          }

          // Check if on extension page AND document is loaded AND has content
          if (status.isExtensionPage && status.readyState === 'complete' && status.rootChildCount > 0) {
            Logger.log(`[waitForExtensionPage] SUCCESS after ${Date.now() - startTime}ms - URL: ${status.url}, rootChildren: ${status.rootChildCount}`);
            return true;
          }

          // If not on extension page, retry navigation
          if (!status.isExtensionPage) {
            attempts++;
            Logger.warn(`[waitForExtensionPage] Attempt ${attempts} - Not on extension page. Current: ${status.url}, Expected: ${targetUrl}`);

            if (attempts <= maxAttempts) {
              Logger.log(`[waitForExtensionPage] Retrying navigation to ${targetUrl}...`);
              await browser.url(targetUrl);
              await browser.pause(1000);
            }
          } else {
            // On extension page but not ready yet - log progress
            if ((Date.now() - startTime) % 3000 < 500) {
              Logger.log(`[waitForExtensionPage] Loading... readyState: ${status.readyState}, hasRoot: ${status.hasRoot}, rootChildren: ${status.rootChildCount}`);
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
        timeout: 30000,
        interval: 500,
        timeoutMsg: `Failed to navigate to extension page after ${maxAttempts} attempts. Target: ${targetUrl}`
      }
    );
  }
}
