import { Page } from './page';
import { getElectronBaseURL } from '../utils/getElectronBaseURL';
import extensionUtils from '../utils/utils';

const EXTENSION_URL = 'chrome-extension://gafhhkghbfjjkeiendhlofajokpaflmk/app.html';

export default new (class ExtendedView implements Page {
  async getBaseUrl() {
    return extensionUtils.isElectron() ? await getElectronBaseURL() : EXTENSION_URL;
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
