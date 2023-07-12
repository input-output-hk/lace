import { Page } from './page';
import { browser } from '@wdio/globals';

const EXTENSION_URL = 'chrome-extension://gafhhkghbfjjkeiendhlofajokpaflmk/app.html';

class ExtendedView implements Page {
  async getBaseUrl() {
    return EXTENSION_URL;
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
