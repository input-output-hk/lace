import { Page } from './page';
import extensionUtils from '../utils/utils';

class PopupView implements Page {
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
  }

  async visitSettings() {
    await browser.url(`${this.basePopupUrl}#/settings`);
    await this.setPopupWindowSize();
  }

  async visitAddressBook() {
    await browser.url(`${this.basePopupUrl}#/address-book`);
    await this.setPopupWindowSize();
  }
}

export default new PopupView();
