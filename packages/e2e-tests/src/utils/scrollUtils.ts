/* eslint-disable no-undef */
import { browser } from '@wdio/globals';

export const scrollToWithYOffset = async (element: WebdriverIO.Element, offsetY: number) => {
  await browser.execute(
    (el, yOffset) => {
      el.scrollIntoView({ block: 'center', inline: 'center' });
      window.scrollBy(0, yOffset);
    },
    element,
    offsetY
  );
};

export const scrollDownWithOffset = async (elements: WebdriverIO.ElementArray) => {
  if (elements.length > 0) {
    const lastContainer = elements[elements.length - 1];
    await scrollToWithYOffset(lastContainer, 30);
  }
};

export const scrollToTheTop = async (elementsSelector: string) => {
  let elements = await $$(elementsSelector);
  let previousFirstElementName = elements.length > 0 ? await elements[0].getText() : 'not_found';

  while (elements.length > 0) {
    const firstContainer = elements[0];
    await scrollToWithYOffset(firstContainer, -30);

    elements = await $$(elementsSelector);
    const currentFirstElementName = elements.length > 0 ? await elements[0].getText() : 'not_found';

    if (currentFirstElementName === previousFirstElementName) {
      break;
    }

    previousFirstElementName = currentFirstElementName;
  }
};
