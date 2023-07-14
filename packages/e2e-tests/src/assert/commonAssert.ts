import { Logger } from '../support/logger';
import clipboard from 'clipboardy';
import webTester from '../actor/webTester';
import { expect } from 'chai';
import { getNumberOfOpenedTabs, switchToLastWindow } from '../utils/window';
import testContext from '../utils/testContext';
import { browser } from '@wdio/globals';

class CommonAssert {
  async assertClipboardContains(text: string) {
    Logger.log(`Checking clipboard to contain: ${text}`);
    const clipboardContent = await clipboard.read();
    expect(clipboardContent).to.contain(text);
  }

  async assertSeeElementWithText(expectedText: string) {
    await webTester.waitUntilSeeElementContainingText(expectedText);
  }

  async assertDontSeeElementWithText(unexpectedText: string, timeout = 3000) {
    await webTester.dontSeeElement(`//*[contains(text(), "${unexpectedText}")]`, timeout);
  }

  async assertSeeTabWithUrl(urlPart: string) {
    await browser.switchWindow(urlPart);
    expect(await browser.getUrl()).to.contain(urlPart);
  }

  async assertSeeNumberOfOpenedTabs(openedTabs: number) {
    expect(await getNumberOfOpenedTabs()).to.equal(openedTabs);
  }

  async assertSeePageInNewTab(expectedPage: string, mode: 'extended' | 'popup') {
    await browser.pause(1000); // Wait for redirect
    await switchToLastWindow();

    const htmlPage = mode === 'extended' ? 'app.html' : 'popup.html';

    const pagePathMap: Record<string, string> = {
      Tokens: '/assets',
      NFTs: '/nfts',
      Transactions: '/activity',
      Staking: '/staking',
      'Address Book': '/address-book',
      Settings: '/settings'
    };

    const pagePath = pagePathMap[expectedPage];
    const path = `${htmlPage}#${pagePath}`;
    const previousTabsCount = testContext.load('tabsCount') as number;
    const currentTabsCount = (await browser.getWindowHandles()).length;
    expect(currentTabsCount).to.equal(previousTabsCount + 1);
    expect(await browser.getUrl()).to.contain(path);
  }

  assertSeeHorizontalScroll = async (shouldBeVisible: boolean) => {
    const scrollBarWidth = 15;
    const pageWidth = Number(await browser.execute(() => document?.querySelector('#main')?.scrollWidth));
    const viewportWidth = (await browser.execute(() => window.innerWidth)) - scrollBarWidth;
    const hasHorizontalScroll = pageWidth >= viewportWidth;
    await expect(hasHorizontalScroll).to.equal(shouldBeVisible);
  };
}

export default new CommonAssert();
