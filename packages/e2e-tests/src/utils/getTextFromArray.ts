/* eslint-disable no-undef */
export const getTextFromElementArray = async (array: WebdriverIO.ElementArray): Promise<string[]> =>
  await array.map(async (element) => await element.getText());
