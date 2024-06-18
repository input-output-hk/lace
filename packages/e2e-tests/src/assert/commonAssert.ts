import { Logger } from '../support/logger';
import clipboard from 'clipboardy';
import { expect } from 'chai';
import { getNumberOfOpenedTabs, switchToLastWindow, waitUntilExpectedNumberOfHandles } from '../utils/window';
import testContext from '../utils/testContext';
import { browser } from '@wdio/globals';
import TopNavigationAssert from './topNavigationAssert';
import { getTestWallet } from '../support/walletConfiguration';

class CommonAssert {
  async assertClipboardContains(text: string) {
    Logger.log(`Checking clipboard to contain: ${text}`);
    const clipboardContent = await clipboard.read();
    expect(clipboardContent).to.contain(text);
  }

  async assertSeeTabWithUrl(urlPart: string) {
    await waitUntilExpectedNumberOfHandles(2);
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
    expect(hasHorizontalScroll).to.equal(shouldBeVisible);
  };

  async assertSeeThemeMode(mode: 'dark' | 'light') {
    expect(await $('html').getAttribute('data-theme')).to.equal(mode);
    await TopNavigationAssert.assertBackgroundColor(mode);
  }

  async assertClipboardContainsAddressOfWallet(walletName: string) {
    const expectedWalletAddress = getTestWallet(walletName).address as string;
    await this.assertClipboardContains(expectedWalletAddress);
  }

  async assertLegalContentIsDisplayed(linkName: string): Promise<void> {
    let expectedUrl;
    switch (linkName) {
      case 'Cookie policy':
        expectedUrl = 'https://www.lace.io/lace-cookie-policy.pdf';
        break;
      case 'Privacy policy':
        expectedUrl = 'https://www.lace.io/iog-privacy-policy.pdf';
        break;
      case 'Terms of service':
      case 'Terms and conditions':
        expectedUrl = 'https://www.lace.io/lace-terms-of-use.pdf';
        break;
      default:
        throw new Error(`Unsupported legal link - ${linkName}`);
    }
    const currentUrl = await browser.getUrl();
    expect(currentUrl).to.contain(expectedUrl);
  }
}

export default new CommonAssert();
