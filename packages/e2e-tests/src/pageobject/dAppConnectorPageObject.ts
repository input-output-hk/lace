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

class DAppConnectorPageObject {
  TEST_DAPP_URL = this.getTestDAppUrl();
  TEST_DAPP_NAME = 'React App';
  DAPP_AUTHORIZATION_MODAL_HANDLE = 'dappConnector.html';

  getTestDAppUrl(): string {
    if (process.env.TEST_DAPP_URL) return process.env.TEST_DAPP_URL;
    throw new Error('TEST_DAPP_URL env variable not set, aborting');
  }

  async openTestDApp() {
    await browser.newWindow(this.TEST_DAPP_URL);
  }

  async waitAndSwitchToAuthorizationWindow() {
    await waitUntilExpectedNumberOfHandles(3);
    await browser.switchWindow(this.DAPP_AUTHORIZATION_MODAL_HANDLE);
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
}

export default new DAppConnectorPageObject();
