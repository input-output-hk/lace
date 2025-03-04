import { LaceView, Page } from './page';
import extensionUtils from '../utils/utils';
import { browser } from '@wdio/globals';
import { getExtensionUUID } from '../utils/firefoxUtils';

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

  async visit(resize = true) {
    if (resize) {
      await this.setPopupWindowSize();
    }
    await browser.url(await this.getBaseUrl());
    await this.waitForPreloaderToDisappear();
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
}

export default new PopupView();
