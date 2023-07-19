/* eslint-disable promise/no-return-wrap */

import { browser } from '@wdio/globals';
import { WebElement } from '../elements/webElement';
import { Logger } from '../support/logger';
import { clearInputFieldValue } from '../utils/inputFieldUtils';
import crypto from 'crypto';

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

  // ugly but resolves some webdriver vs react issues
  // simple setValue() just does not work!
  async fillField(selector: string, value: string) {
    try {
      await this.clearInputText(selector);
      await value
        .split('')
        // eslint-disable-next-line unicorn/no-array-reduce
        .reduce(async (prev: Promise<string>, current: string) => {
          const nextString = `${await prev}${current}`;
          await $(selector).addValue(current);
          await $(selector).waitUntil(
            async () => {
              const text = await $(selector).getValue();
              return text === nextString;
            },
            {
              timeout: 5000,
              interval: 100
            }
          );

          return nextString;
        }, Promise.resolve(''));
    } catch (error) {
      Logger.log(`SetInputValue Error: ${error}`);
    }
  }

  // workaround because $(selector).clearValue() does not work
  async clearInputText(selector: string): Promise<void> {
    const selectorValue = await $(selector).getValue();
    if (selectorValue !== null) {
      await clearInputFieldValue(selector);
    }
  }

  // eslint-disable-next-line no-undef
  async clearInputWebElement(selector: WebdriverIO.Element): Promise<void> {
    const elementValue = await selector.getValue();
    if (elementValue !== null) {
      await selector.click();
      process.platform === 'darwin' ? await browser.keys(['Command', 'a']) : await browser.keys(['Control', 'a']);
      await browser.keys('Backspace');
    }
  }

  async fillComponent(component: WebElement, value: string) {
    await this.fillField(component.toJSLocator(), value);
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

  async hoverOnElement(selector: string, pauseAfterMs?: number): Promise<void> {
    Logger.log(`Hover on ${selector}`);
    const element = await $(selector);
    await element.moveTo();
    if (pauseAfterMs) {
      Logger.log(`Pause for ${pauseAfterMs}ms after hover`);
      await browser.pause(pauseAfterMs);
    }
  }

  async hoverOnWebElement(element: WebElement, pauseAfterMs?: number): Promise<void> {
    await this.hoverOnElement(element.toJSLocator(), pauseAfterMs);
  }

  async clickElement(element: WebElement, retries?: number): Promise<void> {
    if (retries && retries > 0 && (await (await $(element.toJSLocator())).isDisplayed())) {
      await browser.pause(500);
      await this.clickElement(element, retries - 1);
    } else {
      await this.clickOnElement(element.toJSLocator(), element.locatorStrategy());
    }
  }

  async scrollIntoView(element: WebElement) {
    await $(element.toJSLocator()).scrollIntoView();
  }

  async getTextValueFromElement(element: WebElement): Promise<string | number> {
    return await this.getTextValue(element.toJSLocator());
  }

  // eslint-disable-next-line no-undef
  async getTextValuesFromArrayElement(array: WebdriverIO.ElementArray): Promise<string[]> {
    return Promise.all(array.map(async (element) => await element.getText()));
  }

  // eslint-disable-next-line no-undef
  async getTextValuesFromArrayElementWithoutDuplicates(array: WebdriverIO.ElementArray): Promise<unknown[]> {
    const arr = Promise.all(array.map(async (element) => (await element.getText()).split(' ').pop()));
    return [...new Set(await arr)];
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

  async getAttributeValue(selector: string, attribute: string) {
    Logger.log(`Getting attribute ${attribute} for selector ${selector}`);
    const element = await $(selector);
    await element.waitForDisplayed();
    return element.getAttribute(attribute);
  }

  async getAttributeValueFromElement(element: WebElement, attribute: string): Promise<string | number> {
    return await this.getAttributeValue(element.toJSLocator(), attribute);
  }

  async getElementCount(selector: string, by: LocatorStrategy): Promise<number> {
    Logger.log(`Get element count for selector ${selector}`);
    return (await browser.findElements(by, selector)).length;
  }

  async waitUntilSeeElement(element: WebElement, timeoutMs = 3000) {
    Logger.log(`waiting for: ${element.toJSLocator()}`);
    await browser.waitUntil(async () => (await $(element.toJSLocator()).isDisplayed()) === true, {
      timeout: timeoutMs,
      timeoutMsg: `failed while waiting for: ${element.toJSLocator()}`
    });
  }

  async waitUntilSeeElementContainingText(text: string, timeoutMs = 3000) {
    const selectorToWait = `//*[contains(text(), "${text}")]`;
    Logger.log(`waiting for: ${selectorToWait}`);
    await browser.waitUntil(async () => (await $(selectorToWait).isExisting()) === true, {
      timeout: timeoutMs,
      timeoutMsg: `failed while waiting for element containing text: ${text}`
    });
  }

  async generateRandomString(length: number) {
    return crypto
      .randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }
})();
