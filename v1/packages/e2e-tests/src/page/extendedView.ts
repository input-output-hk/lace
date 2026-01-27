import { LaceView, Page } from './page';
import { browser } from '@wdio/globals';
import extensionUtils from '../utils/utils';
import { getExtensionUUID } from '../utils/firefoxUtils';
import { Logger } from '../support/logger';

class ExtendedView extends LaceView implements Page {
  // Uses base class waitForPreloaderToDisappear() with proper timeout, logging, and crash detection

  async getBaseUrl() {
    if ((await extensionUtils.getBrowser()) !== 'firefox') {
      return 'chrome-extension://gafhhkghbfjjkeiendhlofajokpaflmk/app.html';
    }
    return `moz-extension://${await getExtensionUUID()}/app.html`;
  }

  /**
   * Visit extension and wait for wallet APIs to be available.
   * 
   * IMPORTANT: After reloadSession(), the extension starts fresh. We must:
   * 1. Navigate to root URL (#/) - this mounts the full React app including DataCheckContainer
   * 2. Wait for React to mount (laceAppChildren > 0)
   * 3. Wait for wallet APIs to be exposed by wallet-api-ui.ts
   * 4. The app may then redirect to #/setup if no wallet exists, but APIs remain available
   * 
   * @param waitForApis - If true, wait for wallet APIs after page load (default: true for tests that inject wallets)
   */
  async visit(waitForApis: boolean = true) {
    const startTime = Date.now();
    const targetUrl = await this.getBaseUrl();
    
    // Always navigate to root URL first (not #/setup) to ensure full app initialization
    // The app will redirect to #/setup if no wallet exists, but by then APIs are available
    Logger.log(`[extendedView.visit] START - navigating to: ${targetUrl} (waitForApis: ${waitForApis})`);
    await browser.url(targetUrl);
    await this.waitForExtensionPage(targetUrl);
    await this.waitForPreloaderToDisappear();
    
    // Wait for wallet APIs - critical for tests that inject wallets programmatically
    if (waitForApis) {
      await this.waitForWalletAPIs(30000);
    }
    
    Logger.log(`[extendedView.visit] COMPLETE after ${Date.now() - startTime}ms`);
  }

  /**
   * Visit without waiting for wallet APIs - use for onboarding tests where no wallet exists yet
   */
  async visitForOnboarding() {
    const startTime = Date.now();
    const targetUrl = await this.getBaseUrl();
    Logger.log(`[extendedView.visitForOnboarding] START - navigating to: ${targetUrl}`);
    await browser.url(targetUrl);
    await this.waitForExtensionPage(targetUrl);
    await this.waitForPreloaderToDisappear();
    Logger.log(`[extendedView.visitForOnboarding] COMPLETE after ${Date.now() - startTime}ms`);
  }

  async visitTokensPage() {
    await browser.url(`${await this.getBaseUrl()}#/assets`);
    await this.waitForPreloaderToDisappear();
  }

  async visitNFTsPage() {
    await browser.url(`${await this.getBaseUrl()}#/nfts`);
    await this.waitForPreloaderToDisappear();
  }

  async visitActivityPage() {
    await browser.url(`${await this.getBaseUrl()}#/activity`);
    await this.waitForPreloaderToDisappear();
  }

  async visitStakingPage() {
    await browser.url(`${await this.getBaseUrl()}#/staking`);
    await this.waitForPreloaderToDisappear();
  }

  async visitSettings() {
    await browser.url(`${await this.getBaseUrl()}#/settings`);
    await this.waitForPreloaderToDisappear();
  }

  async visitAddressBook() {
    await browser.url(`${await this.getBaseUrl()}#/address-book`);
    await this.waitForPreloaderToDisappear();
  }

  async visitDAppExplorer() {
    await browser.url(`${await this.getBaseUrl()}#/dapp-explorer`);
    await this.waitForPreloaderToDisappear();
  }

  async visitVotingCenter() {
    await browser.url(`${await this.getBaseUrl()}#/voting`);
    await this.waitForPreloaderToDisappear();
  }

  async visitTrezorSetupAccountPageWithOverride() {
    await browser.url(`${await this.getBaseUrl()}#/setup/hardware?force-trezor-picked`);
    await this.waitForPreloaderToDisappear();
  }

  async visitNotificationsPage() {
    await browser.url(`${await this.getBaseUrl()}#/notifications`);
    await this.waitForPreloaderToDisappear();
  }
}

export default new ExtendedView();
