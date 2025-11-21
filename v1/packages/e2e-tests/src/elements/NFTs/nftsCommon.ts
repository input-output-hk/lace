import { scrollToWithYOffset } from '../../utils/scrollUtils';
import { browser } from '@wdio/globals';
import NftsPage from './nftsPage';

class NftsCommon {
  async getAllNftNamesWithScroll(elementSelector: string): Promise<string[]> {
    const nftNames: string[] = [];
    await NftsPage.nftPlaceholder.waitForDisplayed({ reverse: true });
    let nftElements = await $$(elementSelector);
    let lastNft = nftElements[nftElements.length - 1];
    await lastNft.waitForStable();
    let lastNftName = await lastNft.getText();
    let hasMoreItems = true;

    while (hasMoreItems) {
      for (const nftElement of nftElements) {
        const nftName = await nftElement.getText();
        if (!nftNames.includes(nftName) && !nftName.toLowerCase().includes('folder')) {
          // skip saving folders
          nftNames.push(nftName);
        }
      }

      await scrollToWithYOffset(lastNft, 100);
      await browser.pause(200);

      nftElements = await $$(elementSelector);
      const newLastNft = nftElements[nftElements.length - 1];
      await newLastNft.waitForStable();
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
