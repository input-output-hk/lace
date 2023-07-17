import { Then, When } from '@cucumber/cucumber';
import simpleTxSideDrawerPageObject from '../pageobject/simpleTxSideDrawerPageObject';
import mainMenuPageObject from '../pageobject/mainMenuPageObject';
import drawerCommonExtendedAssert from '../assert/drawerCommonExtendedAssert';
import extendedView from '../page/extendedView';
import popupView from '../page/popupView';
import commonAssert from '../assert/commonAssert';
import { getTestWallet } from '../support/walletConfiguration';
import helpAndSupportPageAssert from '../assert/helpAndSupportPageAssert';
import { t } from '../utils/translationService';
import localStorageInitializer from '../fixture/localStorageInitializer';
import localStorageManager from '../utils/localStorageManager';
import networkManager from '../utils/networkManager';
import { DrawerCommonExtended } from '../elements/drawerCommonExtended';
import { Logger } from '../support/logger';
import clipboard from 'clipboardy';
import { cleanBrowserStorage } from '../utils/browserStorage';
import BackgroundStorageAssert from '../assert/backgroundStorageAssert';
import topNavigationAssert from '../assert/topNavigationAssert';
import testContext from '../utils/testContext';
import MenuHeader from '../elements/menuHeader';
import { closeAllTabsExceptActiveOne, switchToLastWindow, switchToWindowWithLace } from '../utils/window';
import { Given } from '@wdio/cucumber-framework';
import tokensPageObject from '../pageobject/tokensPageObject';
import menuMainAssert from '../assert/menuMainAssert';
import LocalStorageAssert from '../assert/localStorageAssert';
import ToastMessageAssert from '../assert/toastMessageAssert';
import menuMainExtended from '../elements/menuMainExtended';
import { browser } from '@wdio/globals';
import faqPageAssert from '../assert/faqPageAssert';
import { visit } from '../utils/pageUtils';

Given(/^Lace is ready for test$/, async () => {
  await tokensPageObject.waitUntilCardanoTokenLoaded();
});

Given(/^Lace with empty wallet is ready for test$/, async () => {
  await tokensPageObject.waitUntilHeadersLoaded();
});
Then(/I navigate to home page on (popup|extended) view/, async (viewType: string) => {
  await browser.pause(1000);
  await (viewType === 'popup' ? popupView.visit() : extendedView.visit());
});

Then(/^I close the drawer by clicking close button$/, async () => {
  await simpleTxSideDrawerPageObject.clickCloseDrawerButton();
});

Then(/^I close the drawer by clicking back button$/, async () => {
  await simpleTxSideDrawerPageObject.clickBackDrawerButton();
});

Then(/^Wallet is synced$/, async () => {
  await topNavigationAssert.assertWalletIsInSyncedStatus();
});

Then(/^Drawer (is|is not) displayed$/, async (shouldSee: string) => {
  await drawerCommonExtendedAssert.assertSeeDrawer(shouldSee === 'is');
});

Then(/^I expect browser local storage to (not be|be) empty$/, async (isEmpty: string) => {
  isEmpty === 'not be'
    ? await LocalStorageAssert.assertLocalStorageIsNotEmpty()
    : await LocalStorageAssert.assertLocalStorageIsEmpty();
});

When(
  // eslint-disable-next-line max-len
  /^I (navigate to|am on) (Tokens|NFTs|Transactions|Staking|Dapp Store|Voting|Address Book|Settings) (extended|popup) page$/,
  async (_ignored: string, targetPage: string, mode: 'extended' | 'popup') => {
    await mainMenuPageObject.navigateToSection(targetPage, mode);
  }
);

When(
  /^I visit (Tokens|NFTs|Activity|Staking|Settings|Address book) page in (extended|popup) mode$/,
  async (
    page: 'Tokens' | 'NFTs' | 'Activity' | 'Staking' | 'Settings' | 'Address book',
    mode: 'extended' | 'popup'
  ) => {
    await visit(page, mode);
  }
);

Then(/(An|No) "([^"]*)" text is displayed/, async (expectedResult: string, expectedText: string) => {
  switch (expectedResult) {
    case 'An': {
      await commonAssert.assertSeeElementWithText((await t(expectedText)) ?? expectedText);
      break;
    }
    case 'No': {
      await commonAssert.assertDontSeeElementWithText((await t(expectedText)) ?? expectedText);
      break;
    }
  }
});

Then(
  /I see that content of "([^"]*)" (public key|address) is in clipboard/,
  async (walletName: string, walletProperty: string) => {
    const testWallet = getTestWallet(walletName);
    const walletPropertyValue =
      walletProperty === 'public key' ? String(testWallet.publicKey) : String(testWallet.address);
    await commonAssert.assertClipboardContains(walletPropertyValue);
  }
);

Then(/^I (see|don't see) a toast with message: "([^"]*)"$/, async (shouldSee: string, toastText: string) => {
  await ToastMessageAssert.assertSeeToastMessage(await t(toastText), shouldSee === 'see');
  if (toastText === 'general.clipboard.copiedToClipboard') Logger.log(`Clipboard contain: ${await clipboard.read()}`);
});

Then(/^I don't see any toast message$/, async () => {
  await ToastMessageAssert.assertSeeToastMessage('', false);
});

Then(/^I see "Help and support" page$/, async () => {
  await helpAndSupportPageAssert.assertSeeHelpAndSupportPage();
});

Then(/New tab with url containing "([^"]*)" is opened/, async (urlPart: string) => {
  await commonAssert.assertSeeTabWithUrl(urlPart);
});

Then(/^FAQ page is displayed$/, async () => {
  await faqPageAssert.assertSeeFaqPage();
});

Then(/^I open wallet: "([^"]*)" in: (extended|popup) mode$/, async (walletName: string, mode: 'extended' | 'popup') => {
  await cleanBrowserStorage();
  await localStorageManager.cleanLocalStorage();
  await localStorageInitializer.initializeWallet(walletName);
  await browser.refresh();
  await topNavigationAssert.assertLogoPresent();
  await mainMenuPageObject.navigateToSection('Tokens', mode);
});

When(/^I am in the offline network mode: (true|false)$/, async (offline: 'true' | 'false') => {
  await networkManager.changeNetworkCapabilitiesOfBrowser(offline === 'true');
});

When(
  /^I enable network interception to fail request: "([^"]*)" with error (\d*)$/,
  async (urlPattern: string, errorCode: number) => {
    await networkManager.failResponse(urlPattern, errorCode);
  }
);

When(/^I click outside the drawer$/, async () => {
  await $(new DrawerCommonExtended().areaOutsideDrawer().toJSLocator()).click();
});

Then(/^Mnemonic is not stored in background storage$/, async () => {
  await BackgroundStorageAssert.assertMnemonicNotInBackgroundStorage();
});

When(/^I click on "Expand" button$/, async () => {
  const tabsCount = (await browser.getWindowHandles()).length;
  await testContext.save('tabsCount', tabsCount);
  await MenuHeader.clickOnExpandButton();
});

Then(/^"Expand" button is displayed (with|without) text$/, async (withText: string) => {
  await topNavigationAssert.assertSeeExpandButton(withText === 'with');
});

When(/^I hover over "Expand" button$/, async () => {
  await MenuHeader.hoverOverExpandButton();
});

Then(
  /^the (Tokens|NFTs|Transactions|Staking|Dapp Store|Voting|Address Book|Settings) page is displayed on a new tab in extended view$/,
  async (expectedPage: string) => {
    await commonAssert.assertSeePageInNewTab(expectedPage, 'extended');
  }
);

Then(/^I press keyboard (Enter|Escape) button$/, async (key: 'Enter' | 'Escape') => {
  await browser.pause(500);
  const k = key === 'Enter' ? 'Return' : 'Escape';
  await browser.keys(k);
  await browser.pause(500);
});

Then(/^I switch to last window$/, async () => {
  await browser.pause(1000);
  await switchToLastWindow();
});

Then(/^I see a different wallet address than in my initial wallet$/, async () => {
  await menuMainAssert.assertAddressIsNotEqual();
});

Then(/^I see (\d) opened tab\(s\)$/, async (numberOfTabs: number) => {
  await commonAssert.assertSeeNumberOfOpenedTabs(Number(numberOfTabs));
});

Then(/^following keys are not present in Local Storage:/, async (keys) => {
  for (const key of keys.raw()) {
    await LocalStorageAssert.assertLocalStorageKeyDoesNotExist(key);
  }
});

Then(/^I close all remaining tabs except current one$/, async () => {
  await closeAllTabsExceptActiveOne();
});

Then(/^I switch to window with Lace$/, async () => {
  await switchToWindowWithLace();
});

When(/^I resize the window to a width of: ([^"]*) and a height of: ([^"]*)$/, async (width: number, height: number) => {
  await browser.setWindowSize(Number(width), Number(height));
});

Then(/^I (see|do not see) expanded icon$/, async (shouldSee: 'see' | 'do not see') => {
  await topNavigationAssert.assertSeeExpandedIcon(shouldSee === 'see');
});

When(/^I hover on the menu$/, async () => {
  await menuMainExtended.hoverOverMenu();
});

Then(/^I (see|do not see) a horizontal scroll$/, async (shouldSee: 'see' | 'do not see') => {
  await commonAssert.assertSeeHorizontalScroll(shouldSee === 'see');
});

Then(
  /^I see (expanded|collapsed) menu for ([^"]*) resolution$/,
  async (menuFormat: 'collapsed' | 'expanded', width: number) => {
    await menuMainAssert.assertMenuFormat(menuFormat, width);
  }
);

When(/^I refresh the page$/, async () => {
  await browser.refresh();
});

When(/^I reopen the page$/, async () => {
  const currentPageUrl = await browser.getUrl();
  await browser.newWindow('');
  await closeAllTabsExceptActiveOne();
  await browser.url(currentPageUrl);
});
