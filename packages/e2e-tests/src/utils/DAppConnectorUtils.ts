import { browser } from '@wdio/globals';
import { waitUntilExpectedNumberOfHandles } from './window';
import AuthorizeDappPage from '../elements/dappConnector/authorizeDAppPage';
import AuthorizeDappModal from '../elements/dappConnector/authorizeDAppModal';
import extendedView from '../page/extendedView';
import settingsExtendedPageObject from '../pageobject/settingsExtendedPageObject';
import AuthorizedDappsPage from '../elements/dappConnector/authorizedDAppsPage';
import popupView from '../page/popupView';
import ToastMessage from '../elements/toastMessage';
import RemoveDAppModal from '../elements/dappConnector/removeDAppModal';
import DAppConnectorAssert, { ExpectedDAppDetails } from '../assert/dAppConnectorAssert';
import { Logger } from '../support/logger';
import TestDAppPage from '../elements/dappConnector/testDAppPage';

class DAppConnectorUtils {
  TEST_DAPP_URL = this.getTestDAppUrl();
  TEST_DAPP_NAME = 'React App';
  DAPP_CONNECTOR_WINDOW_HANDLE = 'dappConnector.html';

  getTestDAppUrl(): string {
    if (process.env.TEST_DAPP_URL) return process.env.TEST_DAPP_URL;
    throw new Error('TEST_DAPP_URL env variable not set, aborting');
  }

  async openTestDApp() {
    await browser.newWindow(this.TEST_DAPP_URL);
  }

  async waitAndSwitchToDAppConnectorWindow(expectedNumberOfHandles: number) {
    await waitUntilExpectedNumberOfHandles(expectedNumberOfHandles);
    await browser.pause(1000);
    await browser.switchWindow(this.DAPP_CONNECTOR_WINDOW_HANDLE);
  }

  async waitAndSwitchToHandle(expectedNumberOfHandles: number, handleNumber: number) {
    await waitUntilExpectedNumberOfHandles(expectedNumberOfHandles);
    await browser.pause(1000);
    await browser.switchToWindow((await browser.getWindowHandles())[handleNumber - 1]);
  }

  async closeDappConnectorWindowHandle() {
    await browser.switchWindow(this.DAPP_CONNECTOR_WINDOW_HANDLE);
    await browser.closeWindow();
    await this.switchToTestDAppWindow();
  }

  async switchToTestDAppWindow() {
    await browser.pause(1000);
    await browser.switchWindow(this.TEST_DAPP_NAME);
  }

  async deauthorizeAllDApps(mode: 'extended' | 'popup') {
    mode === 'extended' ? await extendedView.visitSettings() : await popupView.visitSettings();
    await settingsExtendedPageObject.clickSettingsItem('Authorized DApps');

    for (const removeDappButton of await AuthorizedDappsPage.dAppRemoveButtons) {
      await removeDappButton.waitForClickable();
      await removeDappButton.click();
      await RemoveDAppModal.confirmButton.waitForClickable();
      await RemoveDAppModal.confirmButton.click();

      await ToastMessage.container.waitForDisplayed();
    }
  }

  async deauthorizeDApp(expectedDappName: string, mode: 'extended' | 'popup') {
    mode === 'extended' ? await extendedView.visitSettings() : await popupView.visitSettings();
    await settingsExtendedPageObject.clickSettingsItem('Authorized DApps');
    await AuthorizedDappsPage.drawerHeaderTitle.waitForClickable();

    for (const dAppName of await AuthorizedDappsPage.dAppNames) {
      if ((await dAppName.getText()) === expectedDappName) {
        await AuthorizedDappsPage.dAppRemoveButtons[Number(dAppName.index)].waitForClickable();
        await AuthorizedDappsPage.dAppRemoveButtons[Number(dAppName.index)].click();
      }
    }
  }

  async switchToDappConnectorPopupAndAuthorize(testDAppDetails: ExpectedDAppDetails, mode: 'Always' | 'Only once') {
    await this.waitAndSwitchToDAppConnectorWindow(3);
    await DAppConnectorAssert.assertSeeAuthorizeDAppPage(testDAppDetails);
    await AuthorizeDappPage.clickButton('Authorize');
    await AuthorizeDappModal.clickButton(mode);
    await this.switchToTestDAppWindow();
    await DAppConnectorAssert.waitUntilBalanceNotEmpty();
  }

  async switchToDappConnectorPopupAndAuthorizeWithRetry(
    testDAppDetails: ExpectedDAppDetails,
    mode: 'Always' | 'Only once'
  ) {
    let retries = 6;
    let isAuthorized = false;
    while (retries) {
      try {
        await this.switchToDappConnectorPopupAndAuthorize(testDAppDetails, mode);
        retries = 0;
        isAuthorized = true;
      } catch (error) {
        retries--;
        Logger.log(`Failed to authorize Dapp. Retries left ${retries}. Error:\n${error}`);
        if ((await browser.getWindowHandles()).length === 3) {
          await this.closeDappConnectorWindowHandle();
        }
        await TestDAppPage.refreshButton.click();
        await browser.pause(1000);
      }
    }
    if (!isAuthorized) await this.switchToDappConnectorPopupAndAuthorize(testDAppDetails, mode);
  }
}

export default new DAppConnectorUtils();
