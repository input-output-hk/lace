/* eslint-disable no-undef */
import { scrollToWithYOffset } from '../../utils/scrollUtils';
import { browser } from '@wdio/globals';

class NftsCommon {
  async getAllNftNamesWithScroll(elementSelector: string): Promise<string[]> {
    const nftNames: string[] = [];
    let nftElements = await $$(elementSelector);
    let lastNft = nftElements[nftElements.length - 1];
    let lastNftName = await lastNft.getText();
    let hasMoreItems = true;

    while (hasMoreItems) {
      for (const nftElement of nftElements) {
        const nftName = await nftElement.getText();
        if (!nftNames.includes(nftName)) {
          nftNames.push(nftName);
        }
      }

      await scrollToWithYOffset(lastNft, 100);
      await browser.pause(200);

      nftElements = await $$(elementSelector);
      const newLastNft = nftElements[nftElements.length - 1];
      const newLastNftName = await newLastNft.getText();

      if (newLastNftName === lastNftName) {
        hasMoreItems = false;
      } else {
        lastNft = newLastNft;
        lastNftName = newLastNftName;
      }
    }

    return nftNames;
  }
}

export default new NftsCommon();
