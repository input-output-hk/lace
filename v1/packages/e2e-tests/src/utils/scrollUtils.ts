/* eslint-disable no-undef */
import { browser } from '@wdio/globals';

export const scrollToWithYOffset = async (element: WebdriverIO.Element, offsetY: number): Promise<void> => {
  await browser.execute(
    (el, yOffset) => {
      el.scrollIntoView({ block: 'center', inline: 'center' });
      window.scrollBy(0, yOffset);
    },
    element,
    offsetY
  );
};

export const scrollDownWithOffset = async (elements: WebdriverIO.ElementArray): Promise<void> => {
  if (elements.length > 0) {
    const lastContainer = elements[elements.length - 1];
    await scrollToWithYOffset(lastContainer, 30);
  }
};

export const scrollToTheTop = async (parentSelector?: string): Promise<void> => {
  const selector = parentSelector
    ? `${parentSelector} [data-test-id="virtuoso-item-list"]`
    : '[data-test-id="virtuoso-item-list"]';
  const listComponent = await $(selector);
  await listComponent.scrollIntoView({ block: 'start', inline: 'start' });
  await browser.pause(500);
};
