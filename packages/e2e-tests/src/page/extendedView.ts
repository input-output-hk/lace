import { Page } from './page';
import { browser } from '@wdio/globals';
import extensionUtils from '../utils/utils';

const EXTENSION_URL = 'chrome-extension://gafhhkghbfjjkeiendhlofajokpaflmk/app.html';

class ExtendedView implements Page {
  extendedWidth = 1920;
  extendedHeight = 1080;

  async getBaseUrl() {
    return EXTENSION_URL;
  }

  async setExtendedWindowSize() {
    if ((await extensionUtils.getBrowser()) === 'chrome') {
      const ua = await extensionUtils.getUserAgent();
      await browser.emulateDevice({
        viewport: {
          width: this.extendedWidth,
          height: this.extendedHeight,
          deviceScaleFactor: 1,
          isMobile: false,
          hasTouch: false,
          isLandscape: false
        },
        userAgent: `${ua}`
      });
    }
  }
  async visit() {
    await browser.url(await this.getBaseUrl());
  }

  async visitTokensPage() {
    await browser.url(`${await this.getBaseUrl()}#/assets`);
  }

  async visitNFTsPage() {
    await browser.url(`${await this.getBaseUrl()}#/nfts`);
  }

  async visitActivityPage() {
    await browser.url(`${await this.getBaseUrl()}#/activity`);
  }

  async visitStakingPage() {
    await browser.url(`${await this.getBaseUrl()}#/staking`);
  }

  async visitSettings() {
    await browser.url(`${await this.getBaseUrl()}#/settings`);
  }

  async visitAddressBook() {
    await browser.url(`${await this.getBaseUrl()}#/address-book`);
  }
}

export default new ExtendedView();
