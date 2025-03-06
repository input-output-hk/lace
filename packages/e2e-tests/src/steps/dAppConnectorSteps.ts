import { Then, When } from '@cucumber/cucumber';
import DAppConnectorAssert, { ExpectedDAppDetails, ExpectedTransactionData } from '../assert/dAppConnectorAssert';
import DAppConnectorUtils from '../utils/DAppConnectorUtils';
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
import { dataTableAsStringArray } from '../utils/cucumberDataHelper';
import { parseWalletAddress } from '../utils/parseWalletAddress';
import { AddressTag } from '../assert/transactionDetailsAssert';
import NoWalletModal from '../elements/dappConnector/noWalletModal';
import AuthorizeDAppPage from '../elements/dappConnector/authorizeDAppPage';
import AuthorizeDAppModal from '../elements/dappConnector/authorizeDAppModal';
import RemoveDAppModal from '../elements/dappConnector/removeDAppModal';

const testDAppDetails: ExpectedDAppDetails = {
  hasLogo: true,
  name: DAppConnectorUtils.TEST_DAPP_NAME,
  url: DAppConnectorUtils.TEST_DAPP_URL
};

When(/^I open test DApp$/, async () => {
  await DAppConnectorUtils.openTestDApp();
});

Then(/^I see DApp authorization window$/, async () => {
  await DAppConnectorUtils.waitAndSwitchToDAppConnectorWindow(3);
  await DAppConnectorAssert.assertSeeAuthorizeDAppPage(testDAppDetails);
});

Then(/^I see DApp collateral window$/, async () => {
  await DAppConnectorUtils.waitAndSwitchToDAppConnectorWindow(3);
  await DAppConnectorAssert.assertSeeCollateralDAppPage(testDAppDetails);
});

Then(/^I see DApp insufficient funds window$/, async () => {
  await DAppConnectorUtils.waitAndSwitchToDAppConnectorWindow(3);
  await DAppConnectorAssert.assertSeeInsufficientFundsDAppPage();
});

Then(/^I see DApp authorization window in (dark|light) mode$/, async (mode: 'dark' | 'light') => {
  await DAppConnectorUtils.waitAndSwitchToDAppConnectorWindow(3);
  await DAppConnectorAssert.assertSeeAuthorizeDAppPage(testDAppDetails);
  await CommonAssert.assertSeeThemeMode(mode);
});

Then(/^I see DApp collateral window in (dark|light) mode$/, async (mode: 'dark' | 'light') => {
  await DAppConnectorUtils.waitAndSwitchToDAppConnectorWindow(3);
  await DAppConnectorAssert.assertSeeCollateralDAppPage(testDAppDetails);
  await CommonAssert.assertSeeThemeMode(mode);
});

Then(/^I see DApp connector "All done" page in (dark|light) mode$/, async (mode: 'dark' | 'light') => {
  await DAppConnectorUtils.waitAndSwitchToDAppConnectorWindow(3);
  await DAppConnectorAssert.assertSeeAllDonePage();
  await CommonAssert.assertSeeThemeMode(mode);
});

Then(/^I see DApp connector "Confirm transaction" page in (dark|light) mode$/, async (mode: 'dark' | 'light') => {
  await DAppConnectorUtils.waitAndSwitchToDAppConnectorWindow(3);
  await CommonAssert.assertSeeThemeMode(mode);
});

Then(/^I see DApp connector "Password" page in (dark|light) mode$/, async (mode: 'dark' | 'light') => {
  await DAppConnectorAssert.assertSeeSignTransactionPage();
  await CommonAssert.assertSeeThemeMode(mode);
});

Then(/^I see DApp connector Sign data "Confirm transaction" page$/, async () => {
  await DAppConnectorUtils.waitAndSwitchToDAppConnectorWindow(3);
});

Then(
  /^I see DApp connector "Confirm transaction" page with all UI elements and with following data in "Transaction Summary" section:$/,
  async (dataTable) => {
    await DAppConnectorUtils.waitAndSwitchToDAppConnectorWindow(3);
    const expectedTransactionData: ExpectedTransactionData = {
      typeOfTransaction: 'Send',
      assetsDetails: dataTableAsStringArray(dataTable)
    };
    await DAppConnectorAssert.assertSeeConfirmTransactionPage(expectedTransactionData);
  }
);

Then(
  /^I see DApp connector "Confirm transaction" page "(From address|To address)" section with following data:$/,
  async (section: 'From address' | 'To address', entries) => {
    await DAppConnectorAssert.assertSeeConfirmFromAddressTransactionPage(section, dataTableAsStringArray(entries));
  }
);

Then(
  /^I see (own|foreign) tag on under address in "(From address|To address)" section$/,
  async (addressTag: AddressTag, section: 'From address' | 'To address') => {
    await DAppConnectorAssert.assertSeeAddressTag(addressTag, section);
  }
);

Then(
  /^I see DApp connector "(Confirm transaction|Something went wrong|All done)" page on (\d) window handle$/,
  async (expectedPage: 'Confirm transaction' | 'Something went wrong' | 'All done', handleNumber: number) => {
    await DAppConnectorUtils.waitAndSwitchToHandle(4, handleNumber);

    const defaultDAppTransactionData: ExpectedTransactionData = {
      typeOfTransaction: 'Send',
      assetsDetails: ['-3 tADA - FEE']
    };

    switch (expectedPage) {
      case 'Confirm transaction':
        await DAppConnectorAssert.assertSeeConfirmTransactionPage(defaultDAppTransactionData);
        break;
      case 'Something went wrong':
        await DAppConnectorAssert.assertSeeSomethingWentWrongPage();
        break;
      case 'All done':
        await DAppConnectorAssert.assertSeeAllDonePage('tx sign');
        break;
      default:
        throw new Error(`Unsupported page: ${expectedPage}`);
    }
  }
);

Then(/^I see DApp connector "Sign transaction" page$/, async () => {
  await DAppConnectorUtils.waitAndSwitchToDAppConnectorWindow(3);
  await DAppConnectorAssert.assertSeeSignTransactionPage();
});

Then(/^I see DApp connector "All done" page(?: from "(data sign)")?$/, async (signType?: 'data sign' | 'tx sign') => {
  await DAppConnectorUtils.waitAndSwitchToDAppConnectorWindow(3);
  await DAppConnectorAssert.assertSeeAllDonePage(signType);
});

Then(/^I don't see DApp window$/, async () => {
  await browser.pause(2000);
  await waitUntilExpectedNumberOfHandles(2);
});

Then(/^I see DApp connection modal$/, async () => {
  await DAppConnectorAssert.assertSeeDAppConnectionModal();
});

Then(/^I see DApp no wallet page$/, async () => {
  await DAppConnectorUtils.waitAndSwitchToDAppConnectorWindow(3);
  await DAppConnectorAssert.assertSeeNoWalletPage();
});

Then(/^I see DApp unlock page$/, async () => {
  await DAppConnectorUtils.waitAndSwitchToDAppConnectorWindow(3);
  await WalletUnlockScreenAssert.assertSeeWalletUnlockScreen();
});

Then(/^I see DApp removal confirmation window$/, async () => {
  await DAppConnectorAssert.assertSeeDAppRemovalConfirmationModal();
});

Then(/^I click "(Authorize|Cancel)" button in DApp authorization window$/, async (button: 'Authorize' | 'Cancel') => {
  await AuthorizeDAppPage.clickButton(button);
});

Then(
  /^I expand "(Origin|From address|To address)" section in DApp transaction window$/,
  async (section: 'Origin' | 'From address' | 'To address') => {
    await ConfirmTransactionPage.expandSectionInDappTransactionWindow(section);
  }
);

Then(/^I click "(Always|Only once)" button in DApp authorization window$/, async (button: 'Always' | 'Only once') => {
  await AuthorizeDAppModal.clickButton(button);
});

Then(/^I click "(Confirm|Cancel)" button in DApp collateral window/, async (button: 'Confirm' | 'Cancel') => {
  await DAppConnectorUtils.waitAndSwitchToDAppConnectorWindow(3);
  await (button === 'Confirm' ? collateralDAppPage.clickAcceptButton() : collateralDAppPage.clickCancelButton());
});

Then(
  /^I click "(Add funds|Cancel)" button in DApp insufficient funds window/,
  async (button: 'Add funds' | 'Cancel') => {
    await DAppConnectorUtils.waitAndSwitchToDAppConnectorWindow(3);
    await (button === 'Add funds'
      ? InsufficientFundsDAppPage.clickAddFundsButton()
      : InsufficientFundsDAppPage.clickCancelButton());
  }
);

When(/^I click "Create or restore a wallet" button in DApp no wallet modal$/, async () => {
  await NoWalletModal.clickCreateRestoreButton();
});

Then(
  /^I click "(Back|Disconnect DApp)" button in DApp removal confirmation modal$/,
  async (button: 'Back' | 'Disconnect DApp') => {
    await RemoveDAppModal.clickButton(button);
  }
);

Then(
  /^I see Lace wallet info in DApp when (not connected|connected)$/,
  async (isConnected: 'not connected' | 'connected') => {
    await DAppConnectorUtils.switchToTestDAppWindow();
    isConnected === 'connected'
      ? await DAppConnectorAssert.assertWalletFoundAndConnectedInTestDApp()
      : await DAppConnectorAssert.assertWalletFoundButNotConnectedInTestDApp();
  }
);

Then(
  /^I verify network magic is (1|2|764824073) for (Preprod|Preview|Mainnet)$/,
  // eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars
  async (magic: '1' | '2' | '764824073', _ignored: 'Preprod' | 'Preview' | 'Mainnet') => {
    await DAppConnectorAssert.assertSeeValidNetworkMagic(magic);
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
    name: DAppConnectorUtils.TEST_DAPP_NAME,
    url: DAppConnectorUtils.TEST_DAPP_URL.split('/')[2]
  };
  await DAppConnectorAssert.assertSeeAuthorizedDAppsOnTheList([expectedDApp]);
});

When(/^I open and authorize test DApp with "(Always|Only once)" setting$/, async (mode: 'Always' | 'Only once') => {
  await DAppConnectorUtils.openTestDApp();
  await DAppConnectorUtils.switchToDappConnectorPopupAndAuthorizeWithRetry(testDAppDetails, mode);
});

Then(/^I de-authorize all DApps in (extended|popup) mode$/, async (mode: 'extended' | 'popup') => {
  await DAppConnectorUtils.deauthorizeAllDApps(mode);
  mode === 'extended' ? await extendedView.visit() : await popupView.visit();
});

Then(/^I de-authorize test DApp in (extended|popup) mode$/, async (mode: 'extended' | 'popup') => {
  await DAppConnectorUtils.deauthorizeDApp(DAppConnectorUtils.TEST_DAPP_NAME, mode);
});

When(/^I click "(Set Collateral|Sign data)" button in test DApp$/, async (button: 'Set Collateral' | 'Sign data') => {
  await DAppConnectorUtils.switchToTestDAppWindow();
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
  await DAppConnectorUtils.switchToTestDAppWindow();
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
      retries--;
    }
  }
  if (retries === 0) {
    throw new Error('Exceeded maximum retry attempts on Run button');
  }
});

Then(/^I click "Send ADA" "Run" button in test DApp without retry$/, async () => {
  await DAppConnectorUtils.switchToTestDAppWindow();
  await browser.pause(1000);
  await TestDAppPage.sendAdaRunButton.click();
});

Then(/^I click "(Send ADA|Send Token)" button in test DApp$/, async (buttonId: 'Send ADA' | 'Send Token') => {
  await DAppConnectorUtils.switchToTestDAppWindow();
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
  await AllDonePage.closeButtonTxSign.waitForStable();
  await AllDonePage.closeButtonTxSign.click();
});

Then(/^I save fee value on DApp "Confirm transaction" page$/, async () => {
  await ConfirmTransactionPage.saveDAppTransactionFeeValue();
});

Then(/^I set send to wallet address to: "([^"]*)" in test DApp$/, async (walletName: string) => {
  await TestDAppPage.sendAdaAddressInput.setValue(String(getTestWallet(walletName).accounts[0].address));
});

Then(
  /^I set send to wallet address to: "([^"]*)" (main|other multiaddress|second account) in test DApp$/,
  async (walletName: string, addressType) => {
    await TestDAppPage.sendAdaAddressInput.setValue(parseWalletAddress(walletName, addressType));
  }
);
