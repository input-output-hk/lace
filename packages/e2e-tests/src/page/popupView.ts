import { LaceView, Page } from './page';
import extensionUtils from '../utils/utils';
import { browser } from '@wdio/globals';

class PopupView extends LaceView implements Page {
  basePopupUrl = 'chrome-extension://gafhhkghbfjjkeiendhlofajokpaflmk/popup.html';
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
    }
  }

  async visit(resize = true) {
    if (resize) {
      await this.setPopupWindowSize();
    }
    await browser.url(this.basePopupUrl);
    await this.waitForPreloaderToDisappear();
  }

  async visitTokensPage() {
    await browser.url(`${this.basePopupUrl}#/assets`);
    await this.setPopupWindowSize();
    await this.waitForPreloaderToDisappear();
  }

  async visitNFTsPage() {
    await browser.url(`${this.basePopupUrl}#/nfts`);
    await this.setPopupWindowSize();
    await this.waitForPreloaderToDisappear();
  }

  async visitActivityPage() {
    await browser.url(`${this.basePopupUrl}#/activity`);
    await this.setPopupWindowSize();
    await this.waitForPreloaderToDisappear();
  }

  async visitStakingPage() {
    await browser.url(`${this.basePopupUrl}#/staking`);
    await this.setPopupWindowSize();
    await this.waitForPreloaderToDisappear();
  }

  async visitSettings() {
    await browser.url(`${this.basePopupUrl}#/settings`);
    await this.setPopupWindowSize();
    await this.waitForPreloaderToDisappear();
  }

  async visitAddressBook() {
    await browser.url(`${this.basePopupUrl}#/address-book`);
    await this.setPopupWindowSize();
    await this.waitForPreloaderToDisappear();
  }

  async visitDAppExplorer() {
    await browser.url(`${this.basePopupUrl}#/dapp-explorer`);
    await this.setPopupWindowSize();
    await this.waitForPreloaderToDisappear();
  }
}

export default new PopupView();
