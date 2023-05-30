import { expect } from 'chai';
import { t } from '../utils/translationService';
import AuthorizeDAppPage from '../elements/dappConnector/authorizeDAppPage';
import AuthorizedDAppsPage from '../elements/dappConnector/authorizedDAppsPage';
import AuthorizeDAppModal from '../elements/dappConnector/authorizeDAppModal';
import ExampleDAppPage from '../elements/dappConnector/testDAppPage';

export type ExpectedAuthorizedDAppDetails = {
  hasLogo: boolean;
  name: string;
  url: string;
};

class DAppConnectorAssert {
  async assertSeeAuthorizeDAppPage(expectedDappName: string, expectedDappUrl: string) {
    await AuthorizeDAppPage.headerLogo.waitForDisplayed();
    await AuthorizeDAppPage.betaPill.waitForDisplayed();
    await expect(await AuthorizeDAppPage.betaPill.getText()).to.equal(await t('core.dapp.beta'));

    await AuthorizeDAppPage.pageTitle.waitForDisplayed();
    await expect(await AuthorizeDAppPage.pageTitle.getText()).to.equal(await t('dapp.connect.header'));

    await AuthorizeDAppPage.dAppLogo.waitForDisplayed();
    await AuthorizeDAppPage.dAppName.waitForDisplayed();
    await expect(await AuthorizeDAppPage.dAppName.getText()).to.equal(expectedDappName);
    await AuthorizeDAppPage.dAppUrl.waitForDisplayed();
    await expect(await AuthorizeDAppPage.dAppUrl.getText()).to.equal(expectedDappUrl);

    await AuthorizeDAppPage.banner.container.waitForDisplayed();
    await AuthorizeDAppPage.banner.icon.waitForDisplayed();
    await AuthorizeDAppPage.banner.description.waitForDisplayed();
    await expect(await AuthorizeDAppPage.banner.description.getText()).to.equal(await t('core.authorizeDapp.warning'));
    await this.assertSeeAuthorizePagePermissions();

    await AuthorizeDAppPage.authorizeButton.waitForDisplayed();
    await expect(await AuthorizeDAppPage.authorizeButton.getText()).to.equal(await t('dapp.connect.btn.accept'));
    await AuthorizeDAppPage.cancelButton.waitForDisplayed();
    await expect(await AuthorizeDAppPage.cancelButton.getText()).to.equal(await t('dapp.connect.btn.cancel'));
  }

  async assertSeeAuthorizePagePermissions() {
    await AuthorizeDAppPage.permissionsTitle.waitForDisplayed();
    await expect(await AuthorizeDAppPage.permissionsTitle.getText()).to.equal(
      `${await t('package.core.authorizeDapp.title', true)}:`
    );

    await AuthorizeDAppPage.permissionsList.waitForDisplayed();
    const currentTexts = await AuthorizeDAppPage.permissionsListItems.map(async (option) => await option.getText());

    const expectedTexts = [
      await t('package.core.authorizeDapp.seeNetwork', true),
      await t('package.core.authorizeDapp.seeWalletUtxo', true),
      await t('package.core.authorizeDapp.seeWalletBalance', true),
      await t('package.core.authorizeDapp.seeWalletAddresses', true)
    ];

    await expect(currentTexts).to.have.all.members(expectedTexts);
  }

  async assertSeeDAppConnectionModal() {
    await AuthorizeDAppModal.container.waitForDisplayed();
    await AuthorizeDAppModal.title.waitForDisplayed();
    await expect(await AuthorizeDAppModal.title.getText()).to.equal(await t('dapp.connect.modal.header'));

    await AuthorizeDAppModal.description.waitForDisplayed();
    await expect(await AuthorizeDAppModal.description.getText()).to.equal(await t('dapp.connect.modal.description'));

    await AuthorizeDAppModal.alwaysButton.waitForDisplayed();
    await expect(await AuthorizeDAppModal.alwaysButton.getText()).to.equal(await t('dapp.connect.modal.allowAlways'));

    await AuthorizeDAppModal.onceButton.waitForDisplayed();
    await expect(await AuthorizeDAppModal.onceButton.getText()).to.equal(await t('dapp.connect.modal.allowOnce'));
  }

  async assertWalletFoundButNotConnectedInTestDApp() {
    await expect(await ExampleDAppPage.walletItem.getAttribute('value')).to.equal('lace');
    await expect(await ExampleDAppPage.walletFound.getText()).to.equal('true');
    await expect(await ExampleDAppPage.walletConnected.getText()).to.equal('false');
    await expect(await ExampleDAppPage.walletApiVersion.getText()).to.equal('0.1.0');
    await expect(await ExampleDAppPage.walletName.getText()).to.equal('lace');
    await expect(await ExampleDAppPage.walletNetworkId.getText()).to.be.empty;
    await expect(await ExampleDAppPage.walletBalance.getText()).to.be.empty;
    await expect(await ExampleDAppPage.walletChangeAddress.getText()).to.be.empty;
    await expect(await ExampleDAppPage.walletStakingAddress.getText()).to.be.empty;
    await expect(await ExampleDAppPage.walletUsedAddress.getText()).to.be.empty;
  }

  async assertSeeAuthorizedDAppsEmptyState(mode: 'extended' | 'popup') {
    if (mode === 'extended') {
      await AuthorizedDAppsPage.drawerNavigationTitle.waitForDisplayed();
      await expect(await AuthorizedDAppsPage.drawerNavigationTitle.getText()).to.equal(
        await t('browserView.settings.heading')
      );

      await AuthorizedDAppsPage.closeButton.waitForDisplayed();
      await AuthorizedDAppsPage.backButton.waitForDisplayed({ reverse: true });
    } else {
      await AuthorizedDAppsPage.closeButton.waitForDisplayed({ reverse: true });
      await AuthorizedDAppsPage.backButton.waitForDisplayed();
    }

    await AuthorizedDAppsPage.drawerHeaderTitle.waitForDisplayed();
    await expect(await AuthorizedDAppsPage.drawerHeaderTitle.getText()).to.equal(await t('dapp.list.title'));

    await AuthorizedDAppsPage.drawerHeaderSubtitle.waitForDisplayed();
    await expect(await AuthorizedDAppsPage.drawerHeaderSubtitle.getText()).to.equal(await t('dapp.list.subTitleEmpty'));

    await AuthorizedDAppsPage.emptyStateImage.waitForDisplayed();
    await AuthorizedDAppsPage.emptyStateText.waitForDisplayed();
    await expect(await AuthorizedDAppsPage.emptyStateText.getText()).to.equal(await t('dapp.list.empty.text'));

    expect(await AuthorizedDAppsPage.dAppContainers.length).to.equal(0);
  }

  async assertSeeAuthorizedDAppsOnTheList(expectedDApps: ExpectedAuthorizedDAppDetails[]) {
    expect(await AuthorizedDAppsPage.dAppContainers.length).to.equal(expectedDApps.length);
    for (const [i, expectedDapp] of expectedDApps.entries()) {
      await AuthorizedDAppsPage.dAppLogos[i].waitForDisplayed({ reverse: !expectedDApps[i].hasLogo });
      await expect(await AuthorizedDAppsPage.dAppNames[i].getText()).to.equal(expectedDapp.name);
      await expect(await AuthorizedDAppsPage.dAppUrls[i].getText()).to.equal(expectedDapp.url);
      await AuthorizedDAppsPage.dAppRemoveButtons[i].waitForDisplayed();
    }
  }
}

export default new DAppConnectorAssert();
