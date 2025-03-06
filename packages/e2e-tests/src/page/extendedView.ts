import { LaceView, Page } from './page';
import { browser } from '@wdio/globals';
import extensionUtils from '../utils/utils';
import { getExtensionUUID } from '../utils/firefoxUtils';

class ExtendedView extends LaceView implements Page {
  async waitForPreloaderToDisappear() {
    await browser.waitUntil(async () => {
      const preloaderExists = await $('#preloader').isExisting();
      return !preloaderExists;
    });
  }

  async getBaseUrl() {
    if ((await extensionUtils.getBrowser()) !== 'firefox') {
      return 'chrome-extension://gafhhkghbfjjkeiendhlofajokpaflmk/app.html';
    }
    return `moz-extension://${await getExtensionUUID()}/app.html`;
  }

  async visit() {
    await browser.url(await this.getBaseUrl());
    await this.waitForPreloaderToDisappear();
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
}

export default new ExtendedView();
