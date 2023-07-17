import { browser } from '@wdio/globals';
import { waitUntilExpectedNumberOfHandles } from '../utils/window';
import AuthorizeDappPage from '../elements/dappConnector/authorizeDAppPage';
import AuthorizeDappModal from '../elements/dappConnector/authorizeDAppModal';
import extendedView from '../page/extendedView';
import settingsExtendedPageObject from './settingsExtendedPageObject';
import AuthorizedDappsPage from '../elements/dappConnector/authorizedDAppsPage';
import popupView from '../page/popupView';
import ToastMessage from '../elements/toastMessage';
import RemoveDAppModal from '../elements/dappConnector/removeDAppModal';
import testContext from '../utils/testContext';
import ConfirmTransactionPage from '../elements/dappConnector/confirmTransactionPage';
import NoWalletModal from '../elements/dappConnector/noWalletModal';

class DAppConnectorPageObject {
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
    await browser.switchWindow(this.DAPP_CONNECTOR_WINDOW_HANDLE);
  }

  async switchToTestDAppWindow() {
    await browser.switchWindow(this.TEST_DAPP_NAME);
  }

  async clickButtonInDAppAuthorizationWindow(button: 'Authorize' | 'Cancel') {
    await AuthorizeDappPage.authorizeButton.waitForDisplayed();
    button === 'Authorize'
      ? await AuthorizeDappPage.authorizeButton.click()
      : await AuthorizeDappPage.cancelButton.click();
  }

  async clickButtonInDAppAuthorizationModal(button: 'Always' | 'Only once') {
    await AuthorizeDappModal.alwaysButton.waitForDisplayed();
    button === 'Always' ? await AuthorizeDappModal.alwaysButton.click() : await AuthorizeDappModal.onceButton.click();
  }

  async clickButtonInDAppRemovalConfirmationModal(button: 'Back' | 'Disconnect DApp') {
    await RemoveDAppModal.cancelButton.waitForDisplayed();
    button === 'Back' ? await RemoveDAppModal.cancelButton.click() : await RemoveDAppModal.confirmButton.click();
  }

  async clickCreateRestoreButtonInDAppNoWalletModal() {
    await NoWalletModal.createRestoreButton.waitForDisplayed();
    await NoWalletModal.createRestoreButton.click();
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

  async saveDappTransactionFeeValue() {
    let feeValue = await ConfirmTransactionPage.transactionAmountFee.getText();
    feeValue = feeValue.replace(' ADA', '').replace('Fee: ', '');
    await testContext.save('feeValueDAppTx', feeValue);
  }
}

export default new DAppConnectorPageObject();
