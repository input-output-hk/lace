import { LaceView, Page } from './page';
import extensionUtils from '../utils/utils';
import { browser } from '@wdio/globals';
import { getExtensionUUID } from '../utils/firefoxUtils';
import { Logger } from '../support/logger';

class PopupView extends LaceView implements Page {
  popupWidth = 360;
  popupHeight = 600;

  async setPopupWindowSize() {
    if ((await extensionUtils.getBrowser()) === 'chrome') {
      const ua = await extensionUtils.getUserAgent();
      await browser.emulateDevice({
        viewport: {
          width: this.popupWidth,
          height: this.popupHeight,
          deviceScaleFactor: 1,
          isMobile: false,
          hasTouch: false,
          isLandscape: false
        },
        userAgent: `${ua}`
      });
    } else {
      await browser.setWindowSize(this.popupWidth, this.popupHeight + 150);
    }
  }

  async getBaseUrl() {
    if ((await extensionUtils.getBrowser()) !== 'firefox') {
      return 'chrome-extension://gafhhkghbfjjkeiendhlofajokpaflmk/popup.html';
    }
    return `moz-extension://${await getExtensionUUID()}/popup.html`;
  }

  /**
   * Visit popup and wait for wallet APIs to be available.
   * @param resize - If true, resize window to popup dimensions (default: true)
   * @param waitForApis - If true, wait for wallet APIs after page load (default: true)
   */
  async visit(resize = true, waitForApis = true) {
    const startTime = Date.now();
    if (resize) {
      await this.setPopupWindowSize();
    }
    const targetUrl = await this.getBaseUrl();
    Logger.log(`[popupView.visit] START - navigating to: ${targetUrl} (waitForApis: ${waitForApis})`);
    await browser.url(targetUrl);
    await this.waitForExtensionPage(targetUrl);
    await this.waitForPreloaderToDisappear();
    
    // Wait for wallet APIs - critical for tests that inject wallets programmatically
    if (waitForApis) {
      await this.waitForWalletAPIs(30000);
    }
    
    Logger.log(`[popupView.visit] COMPLETE after ${Date.now() - startTime}ms`);
  }

  /**
   * Visit without waiting for wallet APIs - use for onboarding tests where no wallet exists yet
   */
  async visitForOnboarding(resize = true) {
    const startTime = Date.now();
    if (resize) {
      await this.setPopupWindowSize();
    }
    const targetUrl = await this.getBaseUrl();
    Logger.log(`[popupView.visitForOnboarding] START - navigating to: ${targetUrl}`);
    await browser.url(targetUrl);
    await this.waitForExtensionPage(targetUrl);
    await this.waitForPreloaderToDisappear();
    Logger.log(`[popupView.visitForOnboarding] COMPLETE after ${Date.now() - startTime}ms`);
  }

  async visitTokensPage() {
    await browser.url(`${await this.getBaseUrl()}#/assets`);
    await this.setPopupWindowSize();
    await this.waitForPreloaderToDisappear();
  }

  async visitNFTsPage() {
    await browser.url(`${await this.getBaseUrl()}#/nfts`);
    await this.setPopupWindowSize();
    await this.waitForPreloaderToDisappear();
  }

  async visitActivityPage() {
    await browser.url(`${await this.getBaseUrl()}#/activity`);
    await this.setPopupWindowSize();
    await this.waitForPreloaderToDisappear();
  }

  async visitStakingPage() {
    await browser.url(`${await this.getBaseUrl()}#/staking`);
    await this.setPopupWindowSize();
    await this.waitForPreloaderToDisappear();
  }

  async visitSettings() {
    await browser.url(`${await this.getBaseUrl()}#/settings`);
    await this.setPopupWindowSize();
    await this.waitForPreloaderToDisappear();
  }

  async visitAddressBook() {
    await browser.url(`${await this.getBaseUrl()}#/address-book`);
    await this.setPopupWindowSize();
    await this.waitForPreloaderToDisappear();
  }

  async visitDAppExplorer() {
    await browser.url(`${await this.getBaseUrl()}#/dapp-explorer`);
    await this.setPopupWindowSize();
    await this.waitForPreloaderToDisappear();
  }

  async visitVotingCenter() {
    await browser.url(`${await this.getBaseUrl()}#/voting`);
    await this.setPopupWindowSize();
    await this.waitForPreloaderToDisappear();
  }

  async visitNamiMode() {
    await browser.url(`${await this.getBaseUrl()}`);
    await this.setPopupWindowSize();
  }

  async visitNotificationsPage() {
    await browser.url(`${await this.getBaseUrl()}#/notifications`);
    await this.setPopupWindowSize();
    await this.waitForPreloaderToDisappear();
  }
}

export default new PopupView();
