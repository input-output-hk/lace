import { expect } from 'chai';
import { t } from '../utils/translationService';
import AuthorizeDAppPage from '../elements/dappConnector/authorizeDAppPage';
import AuthorizedDAppsPage from '../elements/dappConnector/authorizedDAppsPage';
import AuthorizeDAppModal from '../elements/dappConnector/authorizeDAppModal';
import ExampleDAppPage from '../elements/dappConnector/testDAppPage';
import ConfirmTransactionPage from '../elements/dappConnector/confirmTransactionPage';
import CommonDappPageElements from '../elements/dappConnector/commonDappPageElements';
import CollateralDAppPage from '../elements/dappConnector/collateralDAppPage';
import SignTransactionPage from '../elements/dappConnector/signTransactionPage';
import DAppTransactionAllDonePage from '../elements/dappConnector/dAppTransactionAllDonePage';
import { Logger } from '../support/logger';
import testContext from '../utils/testContext';
import RemoveDAppModal from '../elements/dappConnector/removeDAppModal';
import NoWalletModal from '../elements/dappConnector/noWalletModal';
import extensionUtils from '../utils/utils';
import TokensPageObject from '../pageobject/tokensPageObject';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';
import { browser } from '@wdio/globals';
import InsufficientFundsDAppPage from '../elements/dappConnector/insufficientFundsDAppPage';

export type ExpectedDAppDetails = {
  hasLogo: boolean;
  name: string;
  url: string;
};

export type ExpectedTransactionData = {
  typeOfTransaction: string;
  amountADA: string;
  amountAsset?: string;
  recipientAddress: string;
};

class DAppConnectorAssert {
  async assertSeeHeader() {
    const commonDappPageElements = new CommonDappPageElements();
    await commonDappPageElements.headerLogo.waitForDisplayed();
    await commonDappPageElements.betaPill.waitForDisplayed();
    await expect(await commonDappPageElements.betaPill.getText()).to.equal(await t('core.dapp.beta'));
  }

  async assertSeeTitleAndDappDetails(expectedTitleKey: string, expectedDappDetails: ExpectedDAppDetails) {
    const currentDAppUrl = new URL(expectedDappDetails.url);
    const commonDappPageElements = new CommonDappPageElements();
    await commonDappPageElements.pageTitle.waitForDisplayed();
    await expect(await commonDappPageElements.pageTitle.getText()).to.equal(await t(expectedTitleKey));
    await commonDappPageElements.dAppLogo.waitForDisplayed({ reverse: !expectedDappDetails.hasLogo });
    await commonDappPageElements.dAppName.waitForDisplayed();
    await expect(await commonDappPageElements.dAppName.getText()).to.equal(expectedDappDetails.name);
    await commonDappPageElements.dAppUrl.waitForDisplayed();
    const expectedUrl = `${currentDAppUrl.protocol}//${currentDAppUrl.host}`;
    await expect(await commonDappPageElements.dAppUrl.getText()).to.equal(expectedUrl);
  }

  async assertSeeAuthorizeDAppPage(expectedDappDetails: ExpectedDAppDetails) {
    await this.assertSeeHeader();
    await this.assertSeeTitleAndDappDetails('dapp.connect.header', expectedDappDetails);

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

  async assertSeeCollateralDAppPage(expectedDappDetails: ExpectedDAppDetails) {
    await this.assertSeeHeader();
    await this.assertSeeTitleAndDappDetails('dapp.collateral.set.header', expectedDappDetails);

    await CollateralDAppPage.modalDescription.waitForDisplayed();
    const currentDAppUrl = new URL(expectedDappDetails.url);

    const valuePlaceholder = 'valuePlaceholder';
    const currentModalText = (await CollateralDAppPage.modalDescription.getText()).replaceAll(
      /(\d+(?:\.\d*)?|\.\d+)/g,
      valuePlaceholder
    );
    const expectedModalText = (await t('dapp.collateral.request'))
      .replaceAll('{{symbol}}', 'tADA')
      .replace('{{dapp}}', `${currentDAppUrl.protocol}//${currentDAppUrl.host}`)
      .replace('{{requestedAmount}}', valuePlaceholder)
      .replace('{{lockableAmount}}', valuePlaceholder);

    expect(currentModalText).to.equal(expectedModalText);

    await CollateralDAppPage.banner.container.waitForDisplayed();
    await CollateralDAppPage.banner.icon.waitForDisplayed();
    await CollateralDAppPage.banner.description.waitForDisplayed();
    expect(await CollateralDAppPage.banner.description.getText()).to.equal(await t('dapp.collateral.amountSeparated'));

    await CollateralDAppPage.acceptButton.waitForDisplayed();
    expect(await CollateralDAppPage.acceptButton.getText()).to.equal(
      await t('browserView.settings.wallet.collateral.confirm')
    );
    await CollateralDAppPage.cancelButton.waitForDisplayed();
    expect(await CollateralDAppPage.cancelButton.getText()).to.equal(await t('general.button.cancel'));
  }

  async assertSeeInsufficientFundsDAppPage() {
    await this.assertSeeHeader();

    await InsufficientFundsDAppPage.pageTitle.waitForDisplayed();
    expect(await InsufficientFundsDAppPage.pageTitle.getText()).to.equal(
      await t('dapp.collateral.insufficientFunds.title')
    );

    await InsufficientFundsDAppPage.image.waitForDisplayed();
    await InsufficientFundsDAppPage.description.waitForDisplayed();
    expect(await InsufficientFundsDAppPage.description.getText()).to.equal(
      await t('dapp.collateral.insufficientFunds.description')
    );

    await InsufficientFundsDAppPage.addFundsButton.waitForDisplayed();
    expect(await InsufficientFundsDAppPage.addFundsButton.getText()).to.equal(
      await t('dapp.collateral.insufficientFunds.add')
    );
    await InsufficientFundsDAppPage.cancelButton.waitForDisplayed();
    expect(await InsufficientFundsDAppPage.cancelButton.getText()).to.equal(await t('general.button.cancel'));
  }

  async assertSeeAuthorizePagePermissions() {
    await AuthorizeDAppPage.permissionsTitle.waitForDisplayed();
    await expect(await AuthorizeDAppPage.permissionsTitle.getText()).to.equal(
      `${await t('package.core.authorizeDapp.title', 'core')}:`
    );

    await AuthorizeDAppPage.permissionsList.waitForDisplayed();
    const currentTexts = await AuthorizeDAppPage.permissionsListItems.map(async (option) => await option.getText());

    const expectedTexts = [
      await t('package.core.authorizeDapp.seeNetwork', 'core'),
      await t('package.core.authorizeDapp.seeWalletUtxo', 'core'),
      await t('package.core.authorizeDapp.seeWalletBalance', 'core'),
      await t('package.core.authorizeDapp.seeWalletAddresses', 'core')
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

  async assertSeeNoWalletPage() {
    await this.assertSeeHeader();
    await NoWalletModal.container.waitForDisplayed();
    await NoWalletModal.image.waitForDisplayed();

    await NoWalletModal.title.waitForDisplayed();
    await expect(await NoWalletModal.title.getText()).to.equal(await t('dapp.noWallet.heading'));

    await NoWalletModal.description.waitForDisplayed();
    await expect(await NoWalletModal.description.getText()).to.equal(await t('dapp.noWallet.description'));

    await NoWalletModal.createRestoreButton.waitForDisplayed();
    await expect(await NoWalletModal.createRestoreButton.getText()).to.equal(await t('dapp.nowallet.btn'));
  }

  async assertSeeDAppRemovalConfirmationModal() {
    await RemoveDAppModal.container.waitForDisplayed();
    await RemoveDAppModal.title.waitForDisplayed();
    await expect(await RemoveDAppModal.title.getText()).to.equal(await t('dapp.delete.title'));

    await RemoveDAppModal.description.waitForDisplayed();
    await expect(await RemoveDAppModal.description.getText()).to.equal(await t('dapp.delete.description'));

    await RemoveDAppModal.confirmButton.waitForDisplayed();
    await expect(await RemoveDAppModal.confirmButton.getText()).to.equal(await t('dapp.delete.confirm'));

    await RemoveDAppModal.cancelButton.waitForDisplayed();
    await expect(await RemoveDAppModal.cancelButton.getText()).to.equal(await t('dapp.delete.cancel'));
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

  async assertWalletFoundAndConnectedInTestDApp() {
    await expect(await ExampleDAppPage.walletItem.getAttribute('value')).to.equal('lace');
    await expect(await ExampleDAppPage.walletFound.getText()).to.equal('true');

    await browser.waitUntil(async () => (await ExampleDAppPage.walletUsedAddress.getText()) !== '', {
      timeout: 3000,
      timeoutMsg: 'failed while waiting for DApp connection data'
    });

    await expect(await ExampleDAppPage.walletApiVersion.getText()).to.equal('0.1.0');
    await expect(await ExampleDAppPage.walletName.getText()).to.equal('lace');
    await expect(await ExampleDAppPage.walletNetworkId.getText()).to.equal(extensionUtils.isMainnet() ? '1' : '0');
    await expect(await ExampleDAppPage.walletUtxo.getText()).not.to.be.empty;

    const actualWalletLovelaceBalance = Number(
      (Number(await TokensPageObject.loadTokenBalance('Cardano')) * 100).toFixed(0)
    );
    const dAppWalletLovelaceBalance = Math.trunc(Number(await ExampleDAppPage.walletBalance.getText()) / 10_000);

    await expect(dAppWalletLovelaceBalance).to.be.closeTo(actualWalletLovelaceBalance, 1);

    await expect(await ExampleDAppPage.walletChangeAddress.getText()).to.equal(
      getTestWallet(TestWalletName.TestAutomationWallet).address
    );
    await expect(await ExampleDAppPage.walletStakingAddress.getText()).not.to.be.empty;
    await expect(await ExampleDAppPage.walletUsedAddress.getText()).to.equal(
      getTestWallet(TestWalletName.TestAutomationWallet).address
    );
  }

  async assertSeeAuthorizedDAppsEmptyState(mode: 'extended' | 'popup') {
    await AuthorizedDAppsPage.drawerHeaderTitle.waitForClickable();

    if (mode === 'extended') {
      await AuthorizedDAppsPage.drawerNavigationTitle.waitForDisplayed();
      await expect(await AuthorizedDAppsPage.drawerNavigationTitle.getText()).to.equal(
        await t('browserView.settings.heading')
      );

      await AuthorizedDAppsPage.drawerHeaderCloseButton.waitForDisplayed();
      await AuthorizedDAppsPage.drawerHeaderBackButton.waitForDisplayed({ reverse: true });
    } else {
      await AuthorizedDAppsPage.drawerHeaderCloseButton.waitForDisplayed({ reverse: true });
      await AuthorizedDAppsPage.drawerHeaderBackButton.waitForDisplayed();
    }

    await expect(await AuthorizedDAppsPage.drawerHeaderTitle.getText()).to.equal(await t('dapp.list.title'));

    await AuthorizedDAppsPage.drawerHeaderSubtitle.waitForDisplayed();
    await expect(await AuthorizedDAppsPage.drawerHeaderSubtitle.getText()).to.equal(await t('dapp.list.subTitleEmpty'));

    await AuthorizedDAppsPage.emptyStateImage.waitForDisplayed();
    await AuthorizedDAppsPage.emptyStateText.waitForDisplayed();
    await expect(await AuthorizedDAppsPage.emptyStateText.getText()).to.equal(await t('dapp.list.empty.text'));

    expect(await AuthorizedDAppsPage.dAppContainers.length).to.equal(0);
  }

  async assertSeeAuthorizedDAppsOnTheList(expectedDApps: ExpectedDAppDetails[]) {
    await AuthorizedDAppsPage.drawerBody.waitForClickable();
    expect(await AuthorizedDAppsPage.dAppContainers.length).to.equal(expectedDApps.length);
    for (const [i, expectedDapp] of expectedDApps.entries()) {
      await AuthorizedDAppsPage.dAppLogos[i].waitForDisplayed({ reverse: !expectedDApps[i].hasLogo });
      await expect(await AuthorizedDAppsPage.dAppNames[i].getText()).to.equal(expectedDapp.name);
      await expect(await AuthorizedDAppsPage.dAppUrls[i].getText()).to.equal(expectedDapp.url);
      await AuthorizedDAppsPage.dAppRemoveButtons[i].waitForDisplayed();
    }
  }

  async assertSeeConfirmTransactionPage(
    expectedDApp: ExpectedDAppDetails,
    expectedTransactionData: ExpectedTransactionData
  ) {
    await this.assertSeeHeader();
    await this.assertSeeTitleAndDappDetails('dapp.confirm.header', expectedDApp);
    await ConfirmTransactionPage.transactionTypeTitle.waitForDisplayed();
    await expect(await ConfirmTransactionPage.transactionTypeTitle.getText()).to.equal(
      await t('dapp.confirm.details.header')
    );
    await ConfirmTransactionPage.transactionType.waitForDisplayed();
    await expect(await ConfirmTransactionPage.transactionType.getText()).to.equal(
      expectedTransactionData.typeOfTransaction
    );

    await ConfirmTransactionPage.transactionAmountTitle.waitForDisplayed();
    await expect(await ConfirmTransactionPage.transactionAmountTitle.getText()).to.equal(
      await t('dapp.confirm.details.amount')
    );

    await ConfirmTransactionPage.transactionAmountValue.waitForDisplayed();
    await expect(await ConfirmTransactionPage.transactionAmountValue.getText()).to.equal(
      expectedTransactionData.amountADA
    );

    await ConfirmTransactionPage.transactionAmountFee.waitForDisplayed();

    if (expectedTransactionData.amountAsset && expectedTransactionData.amountAsset !== '0') {
      await ConfirmTransactionPage.transactionAmountAsset.waitForDisplayed();
      await expect(await ConfirmTransactionPage.transactionAmountAsset.getText()).to.equal(
        expectedTransactionData.amountAsset
      );
    }

    await ConfirmTransactionPage.transactionRecipientTitle.waitForDisplayed();
    await expect(await ConfirmTransactionPage.transactionRecipientTitle.getText()).to.equal(
      await t('dapp.confirm.details.recepient')
    );
    await expect(await ConfirmTransactionPage.transactionRecipientAddress.getText()).to.contain(
      expectedTransactionData.recipientAddress.slice(-10)
    );

    await ConfirmTransactionPage.confirmButton.waitForDisplayed();
    await expect(await ConfirmTransactionPage.confirmButton.getText()).to.equal(await t('dapp.confirm.btn.confirm'));

    await ConfirmTransactionPage.cancelButton.waitForDisplayed();
    await expect(await ConfirmTransactionPage.cancelButton.getText()).to.equal(await t('dapp.confirm.btn.cancel'));
  }

  async assertSeeSignTransactionPage() {
    await this.assertSeeHeader();
    await SignTransactionPage.passwordInput.container.waitForDisplayed();
    await SignTransactionPage.confirmButton.waitForDisplayed();
    await expect(await SignTransactionPage.confirmButton.getText()).to.equal(await t('dapp.confirm.btn.confirm'));
    await SignTransactionPage.cancelButton.waitForDisplayed();
    await expect(await SignTransactionPage.cancelButton.getText()).to.equal(await t('dapp.confirm.btn.cancel'));
  }

  async assertSeeAllDonePage() {
    await this.assertSeeHeader();
    await DAppTransactionAllDonePage.image.waitForDisplayed();

    await DAppTransactionAllDonePage.heading.waitForDisplayed();
    await expect(await DAppTransactionAllDonePage.heading.getText()).to.equal(
      await t('browserView.transaction.success.youCanSafelyCloseThisPanel')
    );

    await DAppTransactionAllDonePage.description.waitForDisplayed();
    await expect(await DAppTransactionAllDonePage.description.getText()).to.equal(
      await t('core.dappTransaction.signedSuccessfully')
    );

    await DAppTransactionAllDonePage.closeButton.waitForDisplayed();
    await expect(await DAppTransactionAllDonePage.closeButton.getText()).to.equal(await t('general.button.close'));

    Logger.log('saving tx hash: null'); // TODO save proper hash once it's added to the all done page
    testContext.save('txHashValue', false);
  }
}

export default new DAppConnectorAssert();
