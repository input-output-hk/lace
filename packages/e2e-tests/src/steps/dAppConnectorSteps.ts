import { Then, When } from '@cucumber/cucumber';
import DAppConnectorAssert, { ExpectedDAppDetails, ExpectedTransactionData } from '../assert/dAppConnectorAssert';
import DAppConnectorPageObject from '../pageobject/dAppConnectorPageObject';
import { browser } from '@wdio/globals';
import { waitUntilExpectedNumberOfHandles } from '../utils/window';
import { getTestWallet } from '../support/walletConfiguration';
import ConfirmTransactionPage from '../elements/dappConnector/confirmTransactionPage';
import SignTransactionPage from '../elements/dappConnector/signTransactionPage';
import AllDonePage from '../elements/dappConnector/dAppTransactionAllDonePage';
import TestDAppPage from '../elements/dappConnector/testDAppPage';
import WalletUnlockScreenAssert from '../assert/walletUnlockScreenAssert';
import CommonAssert from '../assert/commonAssert';
import extendedView from '../page/extendedView';
import popupView from '../page/popupView';
import { Logger } from '../support/logger';
import collateralDAppPage from '../elements/dappConnector/collateralDAppPage';
import InsufficientFundsDAppPage from '../elements/dappConnector/insufficientFundsDAppPage';

const testDAppDetails: ExpectedDAppDetails = {
  hasLogo: true,
  name: DAppConnectorPageObject.TEST_DAPP_NAME,
  url: DAppConnectorPageObject.TEST_DAPP_URL
};

When(/^I open test DApp$/, async () => {
  await DAppConnectorPageObject.openTestDApp();
});

Then(/^I see DApp authorization window$/, async () => {
  await DAppConnectorPageObject.waitAndSwitchToDAppConnectorWindow(3);
  await DAppConnectorAssert.assertSeeAuthorizeDAppPage(testDAppDetails);
});

Then(/^I see DApp collateral window$/, async () => {
  await DAppConnectorPageObject.waitAndSwitchToDAppConnectorWindow(3);
  await DAppConnectorAssert.assertSeeCollateralDAppPage(testDAppDetails);
});

Then(/^I see DApp insufficient funds window$/, async () => {
  await DAppConnectorPageObject.waitAndSwitchToDAppConnectorWindow(3);
  await DAppConnectorAssert.assertSeeInsufficientFundsDAppPage();
});

Then(/^I see DApp authorization window in (dark|light) mode$/, async (mode: 'dark' | 'light') => {
  await DAppConnectorPageObject.waitAndSwitchToDAppConnectorWindow(3);
  await DAppConnectorAssert.assertSeeAuthorizeDAppPage(testDAppDetails);
  await CommonAssert.assertSeeThemeMode(mode);
});

Then(/^I see DApp collateral window in (dark|light) mode$/, async (mode: 'dark' | 'light') => {
  await DAppConnectorPageObject.waitAndSwitchToDAppConnectorWindow(3);
  await DAppConnectorAssert.assertSeeCollateralDAppPage(testDAppDetails);
  await CommonAssert.assertSeeThemeMode(mode);
});

Then(/^I see DApp connector "All done" page in (dark|light) mode$/, async (mode: 'dark' | 'light') => {
  await DAppConnectorPageObject.waitAndSwitchToDAppConnectorWindow(3);
  await DAppConnectorAssert.assertSeeAllDonePage();
  await CommonAssert.assertSeeThemeMode(mode);
});

Then(/^I see DApp connector "Confirm transaction" page in (dark|light) mode$/, async (mode: 'dark' | 'light') => {
  await DAppConnectorPageObject.waitAndSwitchToDAppConnectorWindow(3);
  await CommonAssert.assertSeeThemeMode(mode);
});

Then(/^I see DApp connector Sign data "Confirm transaction" page$/, async () => {
  await DAppConnectorPageObject.waitAndSwitchToDAppConnectorWindow(3);
  await DAppConnectorAssert.assertSeeSignDataConfirmTransactionPage(
    testDAppDetails,
    String(getTestWallet('TestAutomationWallet').address)
  );
});

Then(
  /^I see DApp connector "Confirm transaction" page with: "([^"]*)", "([^"]*)" assets and receiving wallet "([^"]*)"$/,
  async (adaValue: string, assetValue: string, walletName: string) => {
    await DAppConnectorPageObject.waitAndSwitchToDAppConnectorWindow(3);

    const expectedTransactionData: ExpectedTransactionData = {
      typeOfTransaction: 'Send',
      amountADA: adaValue,
      amountAsset: assetValue,
      recipientAddress: String(getTestWallet(walletName).address)
    };
    await DAppConnectorAssert.assertSeeConfirmTransactionPage(testDAppDetails, expectedTransactionData);
  }
);

Then(
  /^I see DApp connector "(Confirm transaction|Something went wrong|All done)" page on (\d) window handle$/,
  async (expectedPage: 'Confirm transaction' | 'Something went wrong' | 'All done', handleNumber: number) => {
    await DAppConnectorPageObject.waitAndSwitchToHandle(4, handleNumber);

    const defaultDAppTransactionData: ExpectedTransactionData = {
      typeOfTransaction: 'Send',
      amountADA: '3.00 ADA',
      amountAsset: '0',
      recipientAddress: String(getTestWallet('WalletReceiveDappTransactionE2E').address)
    };

    switch (expectedPage) {
      case 'Confirm transaction':
        await DAppConnectorAssert.assertSeeConfirmTransactionPage(testDAppDetails, defaultDAppTransactionData);
        break;
      case 'Something went wrong':
        await DAppConnectorAssert.assertSeeSomethingWentWrongPage();
        break;
      case 'All done':
        await DAppConnectorAssert.assertSeeAllDonePage();
        break;
      default:
        throw new Error(`Unsupported page: ${expectedPage}`);
    }
  }
);

Then(/^I see DApp connector "Sign transaction" page$/, async () => {
  await DAppConnectorPageObject.waitAndSwitchToDAppConnectorWindow(3);
  await DAppConnectorAssert.assertSeeSignTransactionPage();
});

Then(/^I see DApp connector "All done" page$/, async () => {
  await DAppConnectorPageObject.waitAndSwitchToDAppConnectorWindow(3);
  await DAppConnectorAssert.assertSeeAllDonePage();
});

Then(/^I don't see DApp window$/, async () => {
  await browser.pause(2000);
  await waitUntilExpectedNumberOfHandles(2);
});

Then(/^I see DApp connection modal$/, async () => {
  await DAppConnectorAssert.assertSeeDAppConnectionModal();
});

Then(/^I see DApp no wallet page$/, async () => {
  await DAppConnectorPageObject.waitAndSwitchToDAppConnectorWindow(3);
  await DAppConnectorAssert.assertSeeNoWalletPage();
});

Then(/^I see DApp unlock page$/, async () => {
  await DAppConnectorPageObject.waitAndSwitchToDAppConnectorWindow(3);
  await WalletUnlockScreenAssert.assertSeeWalletUnlockScreen();
});

Then(/^I see DApp removal confirmation window$/, async () => {
  await DAppConnectorAssert.assertSeeDAppRemovalConfirmationModal();
});

Then(/^I click "(Authorize|Cancel)" button in DApp authorization window$/, async (button: 'Authorize' | 'Cancel') => {
  await DAppConnectorPageObject.clickButtonInDAppAuthorizationWindow(button);
});

Then(/^I click "(Always|Only once)" button in DApp authorization window$/, async (button: 'Always' | 'Only once') => {
  await DAppConnectorPageObject.clickButtonInDAppAuthorizationModal(button);
});

Then(/^I click "(Confirm|Cancel)" button in DApp collateral window/, async (button: 'Confirm' | 'Cancel') => {
  await DAppConnectorPageObject.waitAndSwitchToDAppConnectorWindow(3);
  await (button === 'Confirm' ? collateralDAppPage.clickAcceptButton() : collateralDAppPage.clickCancelButton());
});

Then(
  /^I click "(Add funds|Cancel)" button in DApp insufficient funds window/,
  async (button: 'Add funds' | 'Cancel') => {
    await DAppConnectorPageObject.waitAndSwitchToDAppConnectorWindow(3);
    await (button === 'Add funds'
      ? InsufficientFundsDAppPage.clickAddFundsButton()
      : InsufficientFundsDAppPage.clickCancelButton());
  }
);

When(/^I click "Create or restore a wallet" button in DApp no wallet modal$/, async () => {
  await DAppConnectorPageObject.clickCreateRestoreButtonInDAppNoWalletModal();
});

Then(
  /^I click "(Back|Disconnect DApp)" button in DApp removal confirmation modal$/,
  async (button: 'Back' | 'Disconnect DApp') => {
    await DAppConnectorPageObject.clickButtonInDAppRemovalConfirmationModal(button);
  }
);

Then(
  /^I see Lace wallet info in DApp when (not connected|connected)$/,
  async (isConnected: 'not connected' | 'connected') => {
    await DAppConnectorPageObject.switchToTestDAppWindow();
    isConnected === 'connected'
      ? await DAppConnectorAssert.assertWalletFoundAndConnectedInTestDApp()
      : await DAppConnectorAssert.assertWalletFoundButNotConnectedInTestDApp();
  }
);

Then(/^I am able to access all window.cardano.lace properties$/, async () => {
  await DAppConnectorAssert.assertSeeWindowCardanoLaceProperties();
});

Then(/^I see "Authorized DApps" section empty state in (extended|popup) mode$/, async (mode: 'extended' | 'popup') => {
  await DAppConnectorAssert.assertSeeAuthorizedDAppsEmptyState(mode);
});

Then(/^I see test DApp on the Authorized DApps list$/, async () => {
  const expectedDApp: ExpectedDAppDetails = {
    hasLogo: true,
    name: DAppConnectorPageObject.TEST_DAPP_NAME,
    url: DAppConnectorPageObject.TEST_DAPP_URL.split('/')[2]
  };
  await DAppConnectorAssert.assertSeeAuthorizedDAppsOnTheList([expectedDApp]);
});

When(/^I open and authorize test DApp with "(Always|Only once)" setting$/, async (mode: 'Always' | 'Only once') => {
  await DAppConnectorPageObject.openTestDApp();
  await DAppConnectorPageObject.switchToDappConnectorPopupAndAuthorizeWithRetry(testDAppDetails, mode);
});

Then(/^I de-authorize all DApps in (extended|popup) mode$/, async (mode: 'extended' | 'popup') => {
  await DAppConnectorPageObject.deauthorizeAllDApps(mode);
  mode === 'extended' ? await extendedView.visit() : await popupView.visit();
});

Then(/^I de-authorize test DApp in (extended|popup) mode$/, async (mode: 'extended' | 'popup') => {
  await DAppConnectorPageObject.deauthorizeDApp(DAppConnectorPageObject.TEST_DAPP_NAME, mode);
});

When(/^I click "(Set Collateral|Sign data)" button in test DApp$/, async (button: 'Set Collateral' | 'Sign data') => {
  await DAppConnectorPageObject.switchToTestDAppWindow();
  await browser.pause(1000);
  switch (button) {
    case 'Set Collateral':
      await TestDAppPage.setCollateralButton.click();
      break;
    case 'Sign data':
      await TestDAppPage.signDataButton.click();
      break;
    default:
      throw new Error(`Unsupported button: ${button}`);
  }
});

Then(/^I click "(Send ADA|Send Token)" "Run" button in test DApp$/, async (runButton: 'Send ADA' | 'Send Token') => {
  await DAppConnectorPageObject.switchToTestDAppWindow();
  await browser.pause(1000);
  const handlesBeforeClick = (await browser.getWindowHandles()).length;

  let retries = 5;
  while (retries) {
    try {
      switch (runButton) {
        case 'Send ADA':
          await TestDAppPage.sendAdaRunButton.click();
          break;
        case 'Send Token':
          await TestDAppPage.sendTokenRunButton.click();
          break;
        default:
          throw new Error(`Unsupported button name: ${runButton}`);
      }
      await browser.waitUntil(async () => (await browser.getWindowHandles()).length === handlesBeforeClick + 1, {
        interval: 1000,
        timeout: 6000,
        timeoutMsg: `failed while waiting for ${handlesBeforeClick + 1} window handles`
      });
      break;
    } catch {
      Logger.log('Failed to open modal. Retry will be executed');
      await browser.refresh();
      retries--;
    }
  }
  if (retries === 0) {
    throw new Error('Exceeded maximum retry attempts on Run button');
  }
});

Then(/^I click "(Send ADA|Send Token)" button in test DApp$/, async (buttonId: 'Send ADA' | 'Send Token') => {
  await DAppConnectorPageObject.switchToTestDAppWindow();
  switch (buttonId) {
    case 'Send ADA':
      await TestDAppPage.sendAdaOption.click();
      break;
    case 'Send Token':
      await TestDAppPage.sendTokenOption.click();
      break;
    default:
      break;
  }
});

Then(/^I click "(Confirm|Cancel)" button on "Confirm transaction" page$/, async (button: 'Confirm' | 'Cancel') => {
  button === 'Confirm'
    ? await ConfirmTransactionPage.confirmButton.click()
    : await ConfirmTransactionPage.cancelButton.click();
});

Then(/^I click "(Confirm|Cancel)" button on "Sign transaction" page$/, async (button: 'Confirm' | 'Cancel') => {
  button === 'Confirm'
    ? await SignTransactionPage.confirmButton.click()
    : await SignTransactionPage.cancelButton.click();
});

Then(/^I click "Close" button on DApp "All done" page$/, async () => {
  await AllDonePage.closeButton.waitForStable();
  await AllDonePage.closeButton.click();
});

Then(/^I save fee value on DApp "Confirm transaction" page$/, async () => {
  await DAppConnectorPageObject.saveDappTransactionFeeValue();
});

Then(/^I set send to wallet address to: "([^"]*)" in test DApp$/, async (walletName: string) => {
  await TestDAppPage.sendAdaAddressInput.setValue(String(getTestWallet(walletName).address));
});
