/* eslint-disable no-undef */
import { browser } from '@wdio/globals';

export const clearInputFieldValue = async (element: string | WebdriverIO.Element): Promise<void> => {
  await (typeof element === 'string' ? $(element).click() : element.click());
  process.platform === 'darwin' ? await browser.keys(['Command', 'a']) : await browser.keys(['Control', 'a']);
  await browser.keys('Backspace');
};

export const setInputFieldValue = async (element: string | WebdriverIO.Element, value: string): Promise<void> => {
  await clearInputFieldValue(element);
  await (typeof element === 'string' ? $(element).setValue(value) : element.setValue(value));
};
