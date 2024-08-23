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
import TokensPage from '../elements/tokensPage';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';
import { browser } from '@wdio/globals';
import InsufficientFundsDAppPage from '../elements/dappConnector/insufficientFundsDAppPage';
import ErrorDAppModal from '../elements/dappConnector/errorDAppModal';
import { getTextFromElementArray } from '../utils/getTextFromArray';
import DAppConnectorPageObject from '../pageobject/dAppConnectorPageObject';
import { parseDappCucumberAssetList } from '../utils/dappConnectorUtils';

export type ExpectedDAppDetails = {
  hasLogo: boolean;
  name: string;
  url: string;
};

export type ExpectedTransactionData = {
  typeOfTransaction: string;
  assetsDetails: string[];
};

class DAppConnectorAssert {
  async assertSeeHeader() {
    const commonDappPageElements = new CommonDappPageElements();
    await commonDappPageElements.headerLogo.waitForDisplayed();
    await commonDappPageElements.betaPill.waitForDisplayed();
    expect(await commonDappPageElements.betaPill.getText()).to.equal(await t('core.dapp.beta'));
  }

  async assertSeeTitleAndDappDetails(expectedTitleKey: string, expectedDappDetails: ExpectedDAppDetails) {
    const currentDAppUrl = new URL(expectedDappDetails.url);
    const commonDappPageElements = new CommonDappPageElements();
    await commonDappPageElements.pageTitle.waitForDisplayed();
    expect(await commonDappPageElements.pageTitle.getText()).to.equal(await t(expectedTitleKey));
    await commonDappPageElements.dAppLogo.waitForDisplayed({ reverse: !expectedDappDetails.hasLogo });
    await commonDappPageElements.dAppName.waitForDisplayed();
    expect(await commonDappPageElements.dAppName.getText()).to.equal(expectedDappDetails.name);
    await commonDappPageElements.dAppUrl.waitForDisplayed();
    const expectedUrl = `${currentDAppUrl.protocol}//${currentDAppUrl.host}`;
    expect(await commonDappPageElements.dAppUrl.getText()).to.equal(expectedUrl);
  }

  async assertSeeAuthorizeDAppPage(expectedDappDetails: ExpectedDAppDetails) {
    await this.assertSeeHeader();
    await this.assertSeeTitleAndDappDetails('dapp.connect.header', expectedDappDetails);
    await AuthorizeDAppPage.banner.container.waitForDisplayed();
    await AuthorizeDAppPage.banner.icon.waitForDisplayed();
    await AuthorizeDAppPage.banner.description.waitForDisplayed();
    expect(await AuthorizeDAppPage.banner.description.getText()).to.equal(await t('core.authorizeDapp.warning'));
    await this.assertSeeAuthorizePagePermissions();
    await AuthorizeDAppPage.authorizeButton.waitForDisplayed();
    expect(await AuthorizeDAppPage.authorizeButton.getText()).to.equal(await t('dapp.connect.btn.accept'));
    await AuthorizeDAppPage.cancelButton.waitForDisplayed();
    expect(await AuthorizeDAppPage.cancelButton.getText()).to.equal(await t('dapp.connect.btn.cancel'));
  }

  async assertSeeCollateralDAppPage(expectedDappDetails: ExpectedDAppDetails) {
    await this.assertSeeHeader();

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
    expect(await AuthorizeDAppPage.permissionsTitle.getText()).to.equal(`${await t('core.authorizeDapp.title')}:`);

    await AuthorizeDAppPage.permissionsList.waitForDisplayed();
    const currentTexts = await AuthorizeDAppPage.permissionsListItems.map(async (option) => await option.getText());

    const expectedTexts = [
      await t('core.authorizeDapp.seeNetwork'),
      await t('core.authorizeDapp.seeWalletUtxo'),
      await t('core.authorizeDapp.seeWalletBalance'),
      await t('core.authorizeDapp.seeWalletAddresses')
    ];

    expect(currentTexts).to.have.all.members(expectedTexts);
  }

  async assertSeeDAppConnectionModal() {
    await AuthorizeDAppModal.container.waitForDisplayed();
    await AuthorizeDAppModal.title.waitForDisplayed();
    expect(await AuthorizeDAppModal.title.getText()).to.equal(await t('dapp.connect.modal.header'));

    await AuthorizeDAppModal.description.waitForDisplayed();
    expect(await AuthorizeDAppModal.description.getText()).to.equal(await t('dapp.connect.modal.description'));

    await AuthorizeDAppModal.alwaysButton.waitForDisplayed();
    expect(await AuthorizeDAppModal.alwaysButton.getText()).to.equal(await t('dapp.connect.modal.allowAlways'));

    await AuthorizeDAppModal.onceButton.waitForDisplayed();
    expect(await AuthorizeDAppModal.onceButton.getText()).to.equal(await t('dapp.connect.modal.allowOnce'));
  }

  async assertSeeNoWalletPage() {
    await this.assertSeeHeader();
    await NoWalletModal.container.waitForDisplayed();
    await NoWalletModal.image.waitForDisplayed();

    await NoWalletModal.title.waitForDisplayed();
    expect(await NoWalletModal.title.getText()).to.equal(await t('dapp.noWallet.heading'));

    await NoWalletModal.description.waitForDisplayed();
    expect(await NoWalletModal.description.getText()).to.equal(await t('dapp.noWallet.description'));

    await NoWalletModal.createRestoreButton.waitForDisplayed();
    expect(await NoWalletModal.createRestoreButton.getText()).to.equal(await t('dapp.noWallet.closeButton'));
  }

  async assertSeeDAppRemovalConfirmationModal() {
    await RemoveDAppModal.container.waitForDisplayed();
    await RemoveDAppModal.title.waitForDisplayed();
    expect(await RemoveDAppModal.title.getText()).to.equal(await t('dapp.delete.title'));

    await RemoveDAppModal.description.waitForDisplayed();
    expect(await RemoveDAppModal.description.getText()).to.equal(await t('dapp.delete.description'));

    await RemoveDAppModal.confirmButton.waitForDisplayed();
    expect(await RemoveDAppModal.confirmButton.getText()).to.equal(await t('dapp.delete.confirm'));

    await RemoveDAppModal.cancelButton.waitForDisplayed();
    expect(await RemoveDAppModal.cancelButton.getText()).to.equal(await t('dapp.delete.cancel'));
  }

  async assertWalletFoundButNotConnectedInTestDApp() {
    expect(await ExampleDAppPage.walletItem.getAttribute('value')).to.equal('lace');
    expect(await ExampleDAppPage.walletFound.getText()).to.equal('true');
    expect(await ExampleDAppPage.walletConnected.getText()).to.equal('false');
    expect(await ExampleDAppPage.walletApiVersion.getText()).to.equal('0.1.0');
    expect(await ExampleDAppPage.walletName.getText()).to.equal('lace');
    expect(await ExampleDAppPage.walletNetworkId.getText()).to.be.empty;
    expect(await ExampleDAppPage.walletBalance.getText()).to.be.empty;
    expect(await ExampleDAppPage.walletChangeAddress.getText()).to.be.empty;
    expect(await ExampleDAppPage.walletStakingAddress.getText()).to.be.empty;
    expect(await ExampleDAppPage.walletUsedAddress.getText()).to.be.empty;
  }

  async waitUntilBalanceNotEmpty() {
    await browser.waitUntil(async () => (await ExampleDAppPage.walletBalance.getText()) !== '', {
      timeout: 6000,
      timeoutMsg: 'failed while waiting for DApp connection data'
    });
  }

  async assertWalletFoundAndConnectedInTestDApp() {
    expect(await ExampleDAppPage.walletItem.getAttribute('value')).to.equal('lace');
    expect(await ExampleDAppPage.walletFound.getText()).to.equal('true');

    await this.waitUntilBalanceNotEmpty();

    expect(await ExampleDAppPage.walletApiVersion.getText()).to.equal('0.1.0');
    expect(await ExampleDAppPage.walletName.getText()).to.equal('lace');
    expect(await ExampleDAppPage.walletNetworkId.getText()).to.equal(extensionUtils.isMainnet() ? '1' : '0');
    expect(await ExampleDAppPage.walletUtxo.getText()).not.to.be.empty;

    const actualWalletLovelaceBalance = Number((Number(await TokensPage.loadTokenBalance('Cardano')) * 100).toFixed(0));
    const dAppWalletLovelaceBalance = Math.trunc(Number(await ExampleDAppPage.walletBalance.getText()) / 10_000);

    expect(dAppWalletLovelaceBalance).to.be.closeTo(actualWalletLovelaceBalance, 2);

    expect(await ExampleDAppPage.walletChangeAddress.getText()).to.equal(
      getTestWallet(TestWalletName.TestAutomationWallet).address
    );
    expect(await ExampleDAppPage.walletStakingAddress.getText()).not.to.be.empty;
    expect(await ExampleDAppPage.walletUsedAddress.getText()).to.equal(
      getTestWallet(TestWalletName.TestAutomationWallet).address
    );
  }

  async assertSeeAuthorizedDAppsEmptyState(mode: 'extended' | 'popup') {
    await AuthorizedDAppsPage.drawerHeaderTitle.waitForClickable();

    if (mode === 'extended') {
      await AuthorizedDAppsPage.drawerNavigationTitle.waitForDisplayed();
      expect(await AuthorizedDAppsPage.drawerNavigationTitle.getText()).to.equal(
        await t('browserView.settings.heading')
      );

      await AuthorizedDAppsPage.drawerHeaderCloseButton.waitForDisplayed();
      await AuthorizedDAppsPage.drawerHeaderBackButton.waitForDisplayed({ reverse: true });
    } else {
      await AuthorizedDAppsPage.drawerHeaderCloseButton.waitForDisplayed({ reverse: true });
      await AuthorizedDAppsPage.drawerHeaderBackButton.waitForDisplayed();
    }

    expect(await AuthorizedDAppsPage.drawerHeaderTitle.getText()).to.equal(await t('dapp.list.title'));

    await AuthorizedDAppsPage.drawerHeaderSubtitle.waitForDisplayed();
    expect(await AuthorizedDAppsPage.drawerHeaderSubtitle.getText()).to.equal(await t('dapp.list.subTitleEmpty'));

    await AuthorizedDAppsPage.emptyStateImage.waitForDisplayed();
    await AuthorizedDAppsPage.emptyStateText.waitForDisplayed();
    expect(await AuthorizedDAppsPage.emptyStateText.getText()).to.equal(await t('dapp.list.empty.text'));

    expect(await AuthorizedDAppsPage.dAppContainers.length).to.equal(0);
  }

  async assertSeeAuthorizedDAppsOnTheList(expectedDApps: ExpectedDAppDetails[]) {
    await AuthorizedDAppsPage.drawerBody.waitForClickable();
    expect(await AuthorizedDAppsPage.dAppContainers.length).to.equal(expectedDApps.length);
    for (const [i, expectedDapp] of expectedDApps.entries()) {
      await AuthorizedDAppsPage.dAppLogos[i].waitForDisplayed({ reverse: !expectedDApps[i].hasLogo });
      expect(await AuthorizedDAppsPage.dAppNames[i].getText()).to.equal(expectedDapp.name);
      expect(await AuthorizedDAppsPage.dAppUrls[i].getText()).to.equal(expectedDapp.url);
      await AuthorizedDAppsPage.dAppRemoveButtons[i].waitForDisplayed();
    }
  }

  async assertSeeConfirmTransactionPage({ assetsDetails, typeOfTransaction }: ExpectedTransactionData) {
    await this.assertSeeHeader();
    await ConfirmTransactionPage.transactionTypeTitle.waitForDisplayed();
    expect(await ConfirmTransactionPage.transactionTypeTitle.getText()).to.equal(
      await t('core.dappTransaction.transaction')
    );
    await ConfirmTransactionPage.transactionType.waitForDisplayed();
    expect(await ConfirmTransactionPage.transactionType.getText()).to.equal(typeOfTransaction);

    await ConfirmTransactionPage.transactionOriginSectionExpanderButton.waitForDisplayed();
    await ConfirmTransactionPage.transactionOriginLabel.waitForDisplayed();
    expect(await ConfirmTransactionPage.transactionOriginLabel.getText()).to.equal(
      await t('core.dappTransaction.origin')
    );
    await ConfirmTransactionPage.expandSectionInDappTransactionWindow('Origin');
    expect(await ConfirmTransactionPage.transactionOrigin.getText()).to.equal(DAppConnectorPageObject.TEST_DAPP_NAME);
    await ConfirmTransactionPage.transactionFeeTitle.waitForDisplayed();
    expect(await ConfirmTransactionPage.transactionFeeTitle.getText()).to.equal(
      await t('core.activityDetails.transactionFee')
    );
    await ConfirmTransactionPage.transactionFeeValueAda.waitForDisplayed();

    const parsedAssetsList = await parseDappCucumberAssetList(assetsDetails);
    expect(await getTextFromElementArray(await ConfirmTransactionPage.transactionSummaryAssetsRows)).to.deep.equal(
      parsedAssetsList
    );

    await ConfirmTransactionPage.transactionFromSectionExpanderButton.waitForDisplayed();
    expect(await ConfirmTransactionPage.transactionFromSectionExpanderLabel.getText()).to.equal(
      await t('core.dappTransaction.fromAddress')
    );
    await ConfirmTransactionPage.transactionToSectionExpanderButton.waitForDisplayed();
    expect(await ConfirmTransactionPage.transactionToSectionExpanderLabel.getText()).to.equal(
      await t('core.dappTransaction.toAddress')
    );

    await ConfirmTransactionPage.confirmButton.waitForDisplayed();
    expect(await ConfirmTransactionPage.confirmButton.getText()).to.equal(await t('dapp.confirm.btn.confirm'));

    await ConfirmTransactionPage.cancelButton.waitForDisplayed();
    expect(await ConfirmTransactionPage.cancelButton.getText()).to.equal(await t('dapp.confirm.btn.cancel'));
  }

  async assertSeeConfirmFromAddressTransactionPage(section: 'To address' | 'From address', assets: string[]) {
    const adjustedAssetsList = await parseDappCucumberAssetList(assets);
    const expectedAssets =
      section === 'To address'
        ? await ConfirmTransactionPage.getAssetsToAddressSection()
        : await ConfirmTransactionPage.getAssetsFromAddressSection();
    expect(expectedAssets).to.deep.equal(adjustedAssetsList);
  }

  async assertSeeAddressTag(addressTag: string, section: 'To address' | 'From address') {
    const expectedTag =
      section === 'To address'
        ? await ConfirmTransactionPage.addressTagToSection.getText()
        : await ConfirmTransactionPage.addressTagFromSection.getText();
    expect(addressTag).to.equal(expectedTag);
  }

  async assertSeeSignTransactionPage() {
    await this.assertSeeHeader();
    await SignTransactionPage.passwordInput.container.waitForDisplayed();
    await SignTransactionPage.confirmButton.waitForDisplayed();
    expect(await SignTransactionPage.confirmButton.getText()).to.equal(await t('dapp.confirm.btn.confirm'));
    await SignTransactionPage.cancelButton.waitForDisplayed();
    expect(await SignTransactionPage.cancelButton.getText()).to.equal(await t('dapp.confirm.btn.cancel'));
  }

  async assertSeeSomethingWentWrongPage() {
    await this.assertSeeHeader();
    await ErrorDAppModal.image.waitForDisplayed();
    await ErrorDAppModal.heading.waitForDisplayed();
    await ErrorDAppModal.description.waitForDisplayed();
    await ErrorDAppModal.closeButton.waitForDisplayed();
    expect(await ErrorDAppModal.heading.getText()).to.equal(await t('dapp.sign.failure.title'));
    expect(await ErrorDAppModal.description.getText()).to.equal(await t('dapp.sign.failure.description'));
  }

  async assertSeeAllDonePage(signType?: 'data sign' | 'tx sign') {
    await this.assertSeeHeader();

    const image = await (signType === 'data sign'
      ? DAppTransactionAllDonePage.imageDataSign
      : DAppTransactionAllDonePage.imageTxSign);
    await image.waitForDisplayed();

    const heading = await (signType === 'data sign'
      ? DAppTransactionAllDonePage.headingDataSign
      : DAppTransactionAllDonePage.headingTxSign);
    await heading.waitForDisplayed();

    expect(await heading.getText()).to.equal(await t('browserView.transaction.success.youCanSafelyCloseThisPanel'));

    const description = await (signType === 'data sign'
      ? DAppTransactionAllDonePage.descriptionDataSign
      : DAppTransactionAllDonePage.descriptionTxSign);
    await description.waitForDisplayed();

    const expectedDescriptionTranslationKey =
      signType === 'data sign' ? 'core.dappSignData.signedSuccessfully' : 'core.dappTransaction.signedSuccessfully';
    expect(await description.getText()).to.equal(await t(expectedDescriptionTranslationKey));

    const closeButton = await (signType === 'data sign'
      ? DAppTransactionAllDonePage.closeButtonDataSign
      : DAppTransactionAllDonePage.closeButtonTxSign);
    await closeButton.waitForDisplayed();
    expect(await closeButton.getText()).to.equal(await t('general.button.close'));

    Logger.log('saving tx hash: null'); // TODO save proper hash once it's added to the all done page
    testContext.saveWithOverride('txHashValue', false);
  }

  async assertSeeWindowCardanoLaceProperties() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const result = await browser.execute(() => window.cardano.lace);
    expect(result.apiVersion).to.equal('0.1.0');
    expect(result.icon).not.to.be.empty;
    expect(result.name).to.equal('lace');
    expect(result.supportedExtensions[0].cip).to.equal(95);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const isEnabled = await browser.execute(() => window.cardano.lace.isEnabled());
    expect(isEnabled).to.be.true;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const enable = await browser.execute(() => window.cardano.lace.enable());
    expect(enable).not.to.be.empty;
  }
}

export default new DAppConnectorAssert();
