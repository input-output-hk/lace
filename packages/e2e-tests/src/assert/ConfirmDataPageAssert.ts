import ConfirmDataPage from '../elements/dappConnector/ConfirmDataPage';
import { expect } from 'chai';
import { t } from '../utils/translationService';

class ConfirmDataPageAssert {
  async assertSeePage(expectedDAppData: any, expectedTransaction: any): Promise<void> {
    await ConfirmDataPage.headerLogo.waitForStable();
    await ConfirmDataPage.headerLogo.waitForDisplayed();
    await ConfirmDataPage.pageTitle.waitForDisplayed();
    expect(await ConfirmDataPage.pageTitle.getText()).to.equal(await t('dapp.confirm.header.confirmData'));
    await ConfirmDataPage.dAppLogo.waitForDisplayed();
    await ConfirmDataPage.dAppName.waitForDisplayed();
    expect(await ConfirmDataPage.dAppName.getText()).to.equal(expectedDAppData.name);
    await ConfirmDataPage.dAppUrl.waitForDisplayed();
    expect(await ConfirmDataPage.dAppUrl.getText()).to.equal(expectedDAppData.url);
    await ConfirmDataPage.addressTitle.waitForDisplayed();
    expect(await ConfirmDataPage.addressTitle.getText()).to.equal(await t('dapp.confirm.address.title'));
    await ConfirmDataPage.addressValue.waitForDisplayed();
    expect(await ConfirmDataPage.addressValue.getText()).to.equal(expectedTransaction.address);
    await ConfirmDataPage.dataTitle.waitForDisplayed();
    expect(await ConfirmDataPage.dataTitle.getText()).to.equal(await t('dapp.confirm.data.title'));
    await ConfirmDataPage.dataValue.waitForDisplayed();
    expect(await ConfirmDataPage.dataValue.getText()).to.equal(expectedTransaction.data);
    await ConfirmDataPage.confirmButton.waitForEnabled();
    expect(await ConfirmDataPage.confirmButton.getText()).to.equal(await t('dapp.confirm.btn.confirm'));
    await ConfirmDataPage.cancelButton.waitForEnabled();
    expect(await ConfirmDataPage.cancelButton.getText()).to.equal(await t('dapp.confirm.btn.cancel'));
  }
}

export default new ConfirmDataPageAssert();
