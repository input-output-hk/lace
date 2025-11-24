/* global WebdriverIO */

import { scrollDownWithOffset, scrollToTheTop } from './scrollUtils';

/**
 * Scroll-scan through the active virtualized list.
 *
 * @param numberOfItems specify how many items should be scanned from the start of the virtualized list
 * @param getVisibleElements function that should always return the currently visible elements in the list
 * @param getElementId function that should return a unique identifier for every element
 * @param handleNextElement iterator callback that will be invoked for every element to perform side-effects
 */
export const scanVirtualizedList = async (
  numberOfItems: number,
  getVisibleElements: () => Promise<WebdriverIO.ElementArray>,
  getElementId: (element: WebdriverIO.Element) => Promise<string>,
  handleNextElement: (element: WebdriverIO.Element, index: number, elementId: string) => Promise<void>
): Promise<void> => {
  // scroll to the top of the visible virtualized list
  await scrollToTheTop();
  // ID references to already visited elements
  const iteratedElementIds: string[] = [];

  while (iteratedElementIds.length < numberOfItems) {
    // get all currently visible elements in the virtualized list
    const visibleElements = await getVisibleElements();
    // filter-out any already iterated elements
    const newVisibleElements = await visibleElements.filter(
      async (el) => !iteratedElementIds.includes(await getElementId(el))
    );
    // iterate over the new visible elements
    for (const element of newVisibleElements) {
      const elementId = await getElementId(element);
      // notify external iterator about next element
      await handleNextElement(element, iteratedElementIds.length + 1, elementId);
      // save the iterated element to avoid duplications
      iteratedElementIds.push(elementId);
      // stop immediately when target index was reached
      if (iteratedElementIds.length >= numberOfItems) break;
    }
    // scroll further down and continue loop
    await scrollDownWithOffset(visibleElements);
  }
};

/**
 * Scroll-scan through the active virtualized list and return only the item at given index
 *
 * @param index specify which item should be returned
 * @param getVisibleElements function that should always return the currently visible elements in the list
 * @param getElementId function that should return a unique identifier for every element
 */
export const getVirtualizedListElementAtIndex = async (
  index: number,
  getVisibleElements: () => Promise<WebdriverIO.ElementArray>,
  getElementId: (element: WebdriverIO.Element) => Promise<string>
): Promise<WebdriverIO.Element | undefined> => {
  let lastElement: WebdriverIO.Element | undefined;
  await scanVirtualizedList(index, getVisibleElements, getElementId, async (nextElement) => {
    lastElement = nextElement;
  });
  return lastElement;
};
