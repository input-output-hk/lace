import { Page } from './page';

const EXTENSION_URL = 'chrome-extension://gafhhkghbfjjkeiendhlofajokpaflmk/app.html';

export default new (class ExtendedView implements Page {
  async getBaseUrl() {
    return EXTENSION_URL;
  }

  async visit() {
    await browser.url(await this.getBaseUrl());
  }

  async visitSettings() {
    await browser.url(`${await this.getBaseUrl()}#/settings`);
  }

  async visitAddressBook() {
    await browser.url(`${await this.getBaseUrl()}#/address-book`);
  }
})();
