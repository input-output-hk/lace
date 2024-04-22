/* eslint-disable promise/no-return-wrap */

import { browser } from '@wdio/globals';
import { WebElement } from '../elements/webElement';
import { Logger } from '../support/logger';

export type LocatorStrategy = 'css selector' | 'xpath';

export default new (class WebTester {
  async getTextValueFromElement(element: WebElement): Promise<string | number> {
    return await this.getTextValue(element.toJSLocator());
  }

  async getTextValue(selector: string): Promise<string | number> {
    Logger.log(`Get text value for selector ${selector}`);
    const sel = await $(selector);
    await sel.waitForDisplayed();
    return await sel
      .getText()
      .then((t) => Promise.resolve(t))
      .catch(() => {
        throw new Error(`error while getting text from element : ${selector}`);
      });
  }

  async waitUntilSeeElement(element: WebElement, timeoutMs = 3000) {
    Logger.log(`waiting for: ${element.toJSLocator()}`);
    await browser.waitUntil(async () => await $(element.toJSLocator()).isDisplayed(), {
      timeout: timeoutMs,
      timeoutMsg: `failed while waiting for: ${element.toJSLocator()}`
    });
  }
})();
