/* global WebdriverIO */
import { browser } from '@wdio/globals';
import clipboard from 'clipboardy';

export const clearInputFieldValue = async (element: string | WebdriverIO.Element): Promise<void> => {
  const resolvedElement = typeof element === 'string' ? await $(element) : element;
  await resolvedElement.waitForClickable();
  await resolvedElement.click();
  const modifierKey = process.platform === 'darwin' ? 'Meta' : 'Control';
  await browser.keys([modifierKey, 'a']);
  await browser.keys('Backspace');
};

export const setInputFieldValue = async (element: string | WebdriverIO.Element, value: string): Promise<void> => {
  await clearInputFieldValue(element);
  await (typeof element !== 'string' ? element.setValue(value) : $(element).setValue(value));
};

export const pasteValueIntoInputField = async (element: string | WebdriverIO.Element, value: string): Promise<void> => {
  try {
    await clipboard.write(value);
    const resolvedElement = typeof element === 'string' ? await $(element) : element;
    await resolvedElement.waitForClickable();
    await resolvedElement.click();
    const modifierKey = process.platform === 'darwin' ? 'Meta' : 'Control';
    await browser.keys([modifierKey, 'v']);
  } catch (error) {
    throw new Error(`Failed to paste value into input field: ${error}`);
  }
};
