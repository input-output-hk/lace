import { Then, When } from '@cucumber/cucumber';
import drawerCommonExtendedAssert from '../assert/drawerCommonExtendedAssert';
import extendedView from '../page/extendedView';
import popupView from '../page/popupView';
import commonAssert from '../assert/commonAssert';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';
import helpAndSupportPageAssert from '../assert/helpAndSupportPageAssert';
import { t } from '../utils/translationService';
import localStorageInitializer from '../fixture/localStorageInitializer';
import localStorageManager from '../utils/localStorageManager';
import networkManager from '../utils/networkManager';
import { Logger } from '../support/logger';
import clipboard from 'clipboardy';
import {
  shiftBackFiatPriceFetchedTimeInBrowserStorage,
  cleanBrowserStorage,
  deleteFiatPriceTimestampFromBackgroundStorage
} from '../utils/browserStorage';
import BackgroundStorageAssert from '../assert/backgroundStorageAssert';
import topNavigationAssert from '../assert/topNavigationAssert';
import testContext from '../utils/testContext';
import MenuHeader from '../elements/menuHeader';
import {
  closeAllTabsExceptActiveOne,
  closeAllTabsExceptOriginalOne,
  switchToLastWindow,
  switchToWindowWithLace,
  switchToWindowWithRetry
} from '../utils/window';
import { Given } from '@wdio/cucumber-framework';
import TokensPage from '../elements/tokensPage';
import ToastMessage from '../elements/toastMessage';
import menuMainAssert from '../assert/menuMainAssert';
import LocalStorageAssert from '../assert/localStorageAssert';
import ToastMessageAssert from '../assert/toastMessageAssert';
import menuMainExtended from '../elements/menuMainExtended';
import { browser } from '@wdio/globals';
import faqPageAssert from '../assert/faqPageAssert';
import { visit } from '../utils/pageUtils';
import CommonDrawerElements from '../elements/CommonDrawerElements';
import DAppConnectorUtils from '../utils/DAppConnectorUtils';
import settingsExtendedPageObject from '../pageobject/settingsExtendedPageObject';
import consoleManager from '../utils/consoleManager';
import consoleAssert from '../assert/consoleAssert';
import {
  addAndActivateWalletInRepository,
  addAndActivateWalletsInRepository,
  clearWalletRepository
} from '../fixture/walletRepositoryInitializer';
import MainLoader from '../elements/MainLoader';
import Modal from '../elements/modal';
import { setCameraAccessPermission } from '../utils/browserPermissionsUtils';
import extensionUtils from '../utils/utils';
import CrashScreen from '../elements/CrashScreen';

Given(/^Lace is ready for test$/, async () => {
  if (await CrashScreen.reloadExtensionButton.isDisplayed()) {
    throw new Error('Crash screen occurred!');
  }
  await MainLoader.waitUntilLoaderDisappears();
  await settingsExtendedPageObject.waitUntilSyncingModalDisappears();
  await settingsExtendedPageObject.closePrivacyPolycyUpdateBanner();
  await settingsExtendedPageObject.multiAddressModalConfirm();
  await TokensPage.waitUntilCardanoTokenLoaded();
  await settingsExtendedPageObject.closeWalletSyncedToast();
});

Then(/^Lace is loaded properly$/, async () => {
  await MainLoader.waitUntilLoaderDisappears();
  await settingsExtendedPageObject.waitUntilSyncingModalDisappears();
  await TokensPage.waitUntilCardanoTokenLoaded();
});

Given(/^Lace with empty wallet is ready for test$/, async () => {
  await TokensPage.waitUntilHeadersLoaded();
  await browser.pause(300);
});

Then(/I navigate to home page on (popup|extended) view/, async (viewType: string) => {
  await browser.pause(1000);
  await (viewType === 'popup' ? popupView.visit() : extendedView.visit());
});

Then(/^I close the drawer by clicking close button$/, async () => {
  await new CommonDrawerElements().clickCloseDrawerButton();
});

Then(/^I close the drawer by clicking back button$/, async () => {
  await new CommonDrawerElements().clickBackDrawerButton();
});

Then(/^I close wallet synced toast/, async () => {
  await settingsExtendedPageObject.closeWalletSyncedToast();
});

Then(/^Wallet is synced$/, async () => {
  await topNavigationAssert.assertWalletIsInSyncedStatus();
});

Then(/^Drawer (is|is not) displayed$/, async (shouldSee: string) => {
  await drawerCommonExtendedAssert.assertSeeDrawer(shouldSee === 'is');
});

Then(/^I expect wallet repository and local storage to (not be|be) empty$/, async (isEmpty: string) => {
  isEmpty === 'not be'
    ? await LocalStorageAssert.assertWalletIsNotDeleted()
    : await LocalStorageAssert.assertWalletIsDeleted();
});

When(
  /^I (navigate to|am on) (Tokens|NFTs|Activity|Staking|Address Book|Settings|DApps|Voting) (extended|popup) page$/,
  async (
    _ignored: string,
    targetPage: 'Tokens' | 'NFTs' | 'Activity' | 'Staking' | 'Settings' | 'Address Book' | 'DApps' | 'Voting',
    mode: 'extended' | 'popup'
  ) => {
    await visit(targetPage, mode, false);
  }
);

When(
  /^I visit (Tokens|NFTs|Activity|Staking|Settings|Address Book|DApps|Voting) page in (extended|popup) mode$/,
  async (
    page: 'Tokens' | 'NFTs' | 'Activity' | 'Staking' | 'Settings' | 'Address Book' | 'DApps' | 'Voting',
    mode: 'extended' | 'popup'
  ) => {
    await visit(page, mode, true);
  }
);

When(/^I close a toast message$/, async () => {
  await ToastMessage.clickCloseButton();
});

Then(
  /I see that content of "([^"]*)" (public key|address) is in clipboard/,
  async (walletName: string, walletProperty: string) => {
    const testWallet = getTestWallet(walletName);
    const walletPropertyValue =
      walletProperty === 'public key'
        ? String(testWallet.accounts[0].publicKey)
        : String(testWallet.accounts[0].address);
    await commonAssert.assertClipboardContains(walletPropertyValue);
  }
);

Then(/^I (see|don't see) a toast with text: "([^"]*)"$/, async (shouldSee: string, toastText: string) => {
  await settingsExtendedPageObject.closeWalletSyncedToast();

  const toastTextToTranslationKeyMap: { [key: string]: string } = {
    'Handle copied': 'core.infoWallet.handleCopied',
    'Address copied': 'core.infoWallet.addressCopied',
    'NFTs added to folder': 'browserView.nfts.folderDrawer.toast.update',
    'NFT removed': 'browserView.nfts.folderDrawer.toast.delete',
    'Folder created successfully': 'browserView.nfts.folderDrawer.toast.create',
    'Folder deleted successfully': 'browserView.nfts.deleteFolderSuccess',
    'Folder renamed successfully': 'browserView.nfts.renameFolderSuccess',
    'Edited successfully': 'browserView.addressBook.toast.editAddress',
    'Address added': 'browserView.addressBook.toast.addAddress',
    'Given address already exists': 'addressBook.errors.givenAddressAlreadyExist',
    'Given name already exists': 'addressBook.errors.givenNameAlreadyExist',
    'Switched network': 'browserView.settings.wallet.network.networkSwitched',
    'Network Error': 'general.errors.networkError',
    'Copied to clipboard': 'general.clipboard.copiedToClipboard',
    'Collateral added': 'browserView.settings.wallet.collateral.toast.add',
    'Your custom submit API is enabled...': 'browserView.settings.wallet.customSubmitApi.usingCustomTxSubmitEndpoint',
    'Your custom submit API is disabled...':
      'browserView.settings.wallet.customSubmitApi.usingStandardTxSubmitEndpoint',
    'Wallet renamed successfully': 'browserView.renameWalletDrawer.renameSuccessful',
    'Shared wallet key copied to clipboard': 'sharedWallets.addSharedWallet.keyGeneration.copyKeys.toastText'
  };

  const translationKey = toastTextToTranslationKeyMap[toastText];
  if (!translationKey) {
    throw new Error(`Unsupported toast text: ${toastText}`);
  }

  await ToastMessageAssert.assertSeeToastMessage(await t(translationKey), shouldSee === 'see');

  if (translationKey === 'general.clipboard.copiedToClipboard') {
    Logger.log(`Clipboard contain: ${await clipboard.read()}`);
  }
});

Then(/^I don't see any toast message$/, async () => {
  await ToastMessageAssert.assertSeeToastMessage('', false);
});

Then(/^I see "Help and support" page URL$/, async () => {
  await helpAndSupportPageAssert.assertSeeHelpAndSupportPageURL();
});

Then(/New tab with url containing "([^"]*)" is opened/, async (urlPart: string) => {
  await commonAssert.assertSeeTabWithUrl(urlPart);
});

Then(/^FAQ page is displayed$/, async () => {
  await faqPageAssert.assertSeeFaqPage();
});

Then(/^I open wallet: "([^"]*)" in: (extended|popup) mode$/, async (walletName: string, mode: 'extended' | 'popup') => {
  await cleanBrowserStorage();
  await clearWalletRepository();
  // Quick fix for: "no such window: no such window: target window already closed from unknown error: web view not found" thrown by next line of code
  // TODO: recheck when LW-12520 (as it can be related)
  await browser.switchWindow(/Lace/);
  await localStorageManager.cleanLocalStorage();

  await (walletName === 'newCreatedWallet'
    ? addAndActivateWalletInRepository(String(testContext.load('newCreatedWallet')))
    : addAndActivateWalletsInRepository([walletName as TestWalletName]));

  await localStorageInitializer.initialiseBasicLocalStorageData(walletName);
  await localStorageInitializer.initializeShowMultiAddressDiscoveryModal(false);
  if (mode === 'popup') {
    await popupView.visit();
  }

  await browser.refresh();
  await closeAllTabsExceptOriginalOne();
  await settingsExtendedPageObject.waitUntilSyncingModalDisappears();
  await settingsExtendedPageObject.closeWalletSyncedToast();
  if (await CrashScreen.reloadExtensionButton.isDisplayed()) {
    throw new Error('Crash screen occurred!');
  }
  await topNavigationAssert.assertLogoPresent();
  await visit('Tokens', mode);
});

When(/^I am in the (offline|online) network mode$/, async (networkMode: 'offline' | 'online') => {
  await browser.throttleNetwork({
    offline: networkMode === 'offline',
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0
  });
  await browser.refresh();
});

When(/^I am in the slow network mode$/, async () => {
  if ((await extensionUtils.getBrowser()) !== 'firefox') {
    await browser.throttleNetwork({ offline: false, latency: 0, downloadThroughput: 1000, uploadThroughput: 1000 });
  }
});

When(/^I click outside the drawer$/, async () => {
  await new CommonDrawerElements().areaOutsideDrawer.click();
});

Then(/^Mnemonic is not stored in background storage$/, async () => {
  await BackgroundStorageAssert.assertMnemonicNotInBackgroundStorage();
});

When(/^I click on "Expand" button$/, async () => {
  const tabsCount = (await browser.getWindowHandles()).length;
  testContext.save('tabsCount', tabsCount);
  await MenuHeader.clickOnExpandButton();
});

Then(/^"Expand" button is displayed (with|without) tooltip$/, async (withTooltip: 'with' | 'without') => {
  await topNavigationAssert.assertSeeExpandButton(withTooltip === 'with');
});

When(/^I hover over "Expand" button$/, async () => {
  await MenuHeader.hoverOverExpandButton();
});

Then(
  /^the (Tokens|NFTs|Activity|Staking|DApps|Voting|Address Book|Settings) page is displayed on a new tab in extended view$/,
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

Then(/^I switch to window with title: ([^"]*)$/, async (url: string) => {
  await switchToWindowWithRetry(url);
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

Then(/^Local Storage "([^"]*)" key has "([^"]*)" value$/, async (key: string, value: string) => {
  await LocalStorageAssert.assertLocalStorageKeyValue(key, value);
});

Then(/^I close all remaining tabs except current one$/, async () => {
  await closeAllTabsExceptActiveOne();
});

Then(/^I switch to window with (Lace|DApp)$/, async (window: 'Lace' | 'DApp') => {
  await (window === 'Lace' ? switchToWindowWithLace() : DAppConnectorUtils.switchToTestDAppWindow());
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

When(/^I set (light|dark) theme mode in Local Storage$/, async (mode: 'light' | 'dark') => {
  await localStorageInitializer.initializeMode(mode);
  await browser.refresh();
});

Given(/^I disable showing Multidelegation beta banner$/, async () => {
  await localStorageInitializer.disableShowingMultidelegationBetaBanner();
});

Given(/^I disable showing Multidelegation DApps issue modal$/, async () => {
  await localStorageInitializer.disableShowingMultidelegationDAppsIssueModal();
});

Given(/^I disable showing multi-address discovery modal$/, async () => {
  await localStorageInitializer.initializeShowMultiAddressDiscoveryModal(false);
});

Then(/^I wait until modal disappears$/, async () => {
  await Modal.waitUntilModalDisappears();
});

Then(/^Clipboard contains address of wallet: "([^"]*)"$/, async (walletName: string) => {
  await commonAssert.assertClipboardContainsAddressOfWallet(walletName);
});

Then(/^Clipboard contains text: "([^"]*)"$/, async (expectedString: string) => {
  await commonAssert.assertClipboardContains(expectedString);
});

When(/^I (enable|disable) console logs collection$/, async (action: 'enable' | 'disable') => {
  switch (action) {
    case 'enable':
      await consoleManager.startLogsCollection();
      break;
    case 'disable':
      await consoleManager.closeOpenedCdpSessions();
      break;
    default:
      throw new Error('Unsupported option');
  }
});

Then(/^I verify there are no errors in console logs$/, async () => {
  await consoleAssert.assertNoErrorsInConsole();
});

Then(/^I verify that logs (are|are not) collected$/, async (logsCollected: 'are' | 'are not') => {
  await consoleAssert.assertLogsAreCollected(logsCollected === 'are');
});

Then(/^I wait (\d*) milliseconds$/, async (delay: 1000) => {
  await browser.pause(delay);
});

When(/^I scroll (down|up) (\d*) pixels$/, async (direction: 'down' | 'up', pixels: number) => {
  const y = direction === 'down' ? Number(pixels) : -Number(pixels);
  await browser.scroll(0, y);
});

Given(/^I confirm multi-address discovery modal$/, async () => {
  await settingsExtendedPageObject.multiAddressModalConfirm();
});

When(/^I enable network interception to fail request: "([^"]*)"$/, async (urlPattern: string) => {
  await networkManager.failRequest(urlPattern);
});

When(
  /^I enable network interception to finish request: "([^"]*)" with error (\d*)$/,
  async (urlPattern: string, errorCode: number) => {
    await networkManager.finishWithResponseCode(urlPattern, errorCode);
  }
);

Given(/^I shift back last fiat price fetch time in local storage by (\d+) seconds$/, async (seconds: number) => {
  await shiftBackFiatPriceFetchedTimeInBrowserStorage(seconds);
});

Then(/^I disable network interception$/, async () => {
  await networkManager.closeOpenedCdpSessions();
});

Given(/^I delete fiat price timestamp from background storage$/, async () => {
  await deleteFiatPriceTimestampFromBackgroundStorage();
});

Then(
  /^"(Cookie policy|Privacy policy|Terms of service|Terms and conditions)" (is|are) displayed in new tab$/,
  // eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars
  async (link: 'Cookie policy' | 'Privacy policy' | 'Terms of service' | 'Terms and conditions', _ignored) => {
    await switchToLastWindow();
    await commonAssert.assertLegalContentIsDisplayed(link);
  }
);

When(/^I wait for main loader to disappear$/, async () => {
  await MainLoader.waitUntilLoaderDisappears();
});

// FIXME: does not work while executed on CI
When(
  /^Set camera access permission: (granted|denied|prompted)$/,
  async (permission: 'granted' | 'denied' | 'prompted') => {
    await setCameraAccessPermission(permission);
    await browser.refresh();
  }
);

Then(/^tempo.vote page is displayed in a new tab$/, async () => {
  const expectedUrl = extensionUtils.isMainnet()
    ? 'https://tempo.vote/'
    : `https://${String(extensionUtils.getNetwork().name).toLowerCase()}.tempo.vote/`;
  await commonAssert.assertSeeTabWithUrl(expectedUrl);
});

Then(
  /(invalid|valid|"N_8J@bne87A") password is not in snapshot/,
  async (password: 'invalid' | 'valid' | 'N_8J@bne87A') => {
    await commonAssert.assertPasswordIsNotPresentInMemorySnapshot(password);
  }
);

When(/^I open empty tab$/, async () => {
  await browser.newWindow('');
});

When(/^I click on "DApps" button$/, async () => {
  const tabsCount = (await browser.getWindowHandles()).length;
  testContext.save('tabsCount', tabsCount);
  await visit('DApps', 'popup', false);
});

When(/^I start tracing$/, async () => {
  if (browser.isChromium) {
    await browser.startTracing();
  } else {
    Logger.log('Tracing not available on non-chromium browsers');
  }
});

When(/^I end tracing$/, async () => {
  if (browser.isChromium) {
    await browser.endTracing();
  } else {
    Logger.log('Tracing not available on non-chromium browsers');
  }
});

Then(
  /^there were approximately (\d+) requests sent \((\d+)% threshold\) \[getPageWeight\(\)]$/,
  async (expectedNumberOfRequests: number, threshold: number) => {
    if (browser.isChromium) {
      const metrics = await browser.getPageWeight();
      const requestCount = metrics.requestCount;
      Logger.log(`Total requests (getPageWeight): ${metrics.requestCount}`);
      await commonAssert.assertValueWithinRange(requestCount, expectedNumberOfRequests, threshold);
    } else {
      Logger.log('getPageWeight() not available on non-chromium browsers');
    }
  }
);

Then(
  /^there were approximately (\d+) requests sent \((\d+)% threshold\) \[Puppeteer and CDP]$/,
  async (expectedNumberOfRequests: number, threshold: number) => {
    if (browser.isChromium) {
      const requestCount = networkManager.getRequestCount();
      Logger.log(`Total requests (Puppeteer and CDP): ${requestCount}`);
      await commonAssert.assertValueWithinRange(requestCount, expectedNumberOfRequests, threshold);
      networkManager.resetRequestCount();
    } else {
      Logger.log('Puppeteer and CDP not available on non-chromium browsers');
    }
  }
);

When('I start counting requests using Puppeteer and CDP', async () => {
  await networkManager.countSentRequests();
});
