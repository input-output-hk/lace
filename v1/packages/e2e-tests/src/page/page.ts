import { browser } from '@wdio/globals';
import { Logger } from '../support/logger';

export interface Page {
  visit(): void;
}

export abstract class LaceView {
  abstract getBaseUrl(): Promise<string>;

  async waitForPreloaderToDisappear(): Promise<void> {
    await browser.waitUntil(
      async () => {
        const preloaderExists = await $('#preloader').isExisting();
        return !preloaderExists;
      },
      { timeout: 5 * 60 * 1000, interval: 1000 }
    );
  }

  /**
   * Verifies browser navigated to extension page successfully.
   * Retries navigation if browser is still on non-extension page.
   */
  async waitForExtensionPage(targetUrl: string): Promise<void> {
    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = 3;

    await browser.waitUntil(
      async () => {
        const currentUrl = await browser.getUrl();
        const isExtensionPage = currentUrl.startsWith('chrome-extension://') || currentUrl.startsWith('moz-extension://');

        if (isExtensionPage) {
          Logger.log(`[waitForExtensionPage] SUCCESS after ${Date.now() - startTime}ms - URL: ${currentUrl}`);
          return true;
        }

        attempts++;
        Logger.warn(`[waitForExtensionPage] Attempt ${attempts} - Not on extension page. Current: ${currentUrl}, Expected: ${targetUrl}`);

        // Retry navigation if not on extension page
        if (attempts <= maxAttempts) {
          Logger.log(`[waitForExtensionPage] Retrying navigation to ${targetUrl}...`);
          await browser.url(targetUrl);
          // Small delay to allow navigation to complete
          await browser.pause(1000);
        }

        return false;
      },
      {
        timeout: 30000,
        interval: 2000,
        timeoutMsg: `Failed to navigate to extension page after ${maxAttempts} attempts. Target: ${targetUrl}`
      }
    );
  }
}
