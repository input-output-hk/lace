/* eslint-disable promise/no-return-wrap */

import { browser } from '@wdio/globals';
import { WebElement } from '../elements/webElement';
import { Logger } from '../support/logger';

export type LocatorStrategy = 'css selector' | 'xpath';

export default new (class WebTester {
  async seeElement(selector: string, reverseOrder = false, timeoutMs = 3000) {
    Logger.log(`Assert see element ${selector}, reverse = ${reverseOrder}`);
    const shouldBeFound = reverseOrder ? 'should not be found' : 'should be found';
    await $(selector).waitForDisplayed({
      timeout: timeoutMs,
      interval: 500,
      reverse: reverseOrder,
      timeoutMsg: `element: ${selector} ${shouldBeFound} after: ${timeoutMs}ms`
    });
  }

  async seeWebElement(element: WebElement) {
    await this.seeElement(element.toJSLocator());
  }

  async dontSeeElement(selector: string, timeout = 3000) {
    Logger.log(`Don't see element ${selector}`);
    const startTime = Date.now();
    await this.seeElement(selector, true, timeout);
    const duration = (Date.now() - startTime) / 1000;
    Logger.log(`Element not in display after: ${duration}s`);
  }

  async dontSeeWebElement(element: WebElement, timeout = 3000) {
    await this.dontSeeElement(element.toJSLocator(), timeout);
  }

  async clickOnElement(selector: string, locatorStrategy?: LocatorStrategy): Promise<void> {
    Logger.log(`Click on ${selector} [strategy=${locatorStrategy ?? 'css selector'}]`);
    const element = await $(selector);
    await element.waitForDisplayed();
    await element
      .waitForClickable({ timeout: 5000 })
      .then(async () => await $(element).click())
      .catch(() => {
        throw new Error(`Element ${selector} not clickable`);
      });
  }

  async clickElement(element: WebElement, retries?: number): Promise<void> {
    if (retries && retries > 0 && (await (await $(element.toJSLocator())).isDisplayed())) {
      await browser.pause(500);
      await this.clickElement(element, retries - 1);
    } else {
      await this.clickOnElement(element.toJSLocator(), element.locatorStrategy());
    }
  }

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
