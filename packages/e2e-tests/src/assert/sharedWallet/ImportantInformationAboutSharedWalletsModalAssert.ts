import ImportantInformationAboutSharedWalletsModal from '../../elements/sharedWallet/ImportantInformationAboutSharedWalletsModal';
import { t } from '../../utils/translationService';
import { expect } from 'chai';

class ImportantInformationAboutSharedWalletsModalAssert {
  async assertSeeModal() {
    await ImportantInformationAboutSharedWalletsModal.title.waitForDisplayed();
    expect(await ImportantInformationAboutSharedWalletsModal.title.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.importantInfo.title')
    );
    await ImportantInformationAboutSharedWalletsModal.subtitle.waitForDisplayed();
    expect(await ImportantInformationAboutSharedWalletsModal.subtitle.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.importantInfo.subtitle')
    );
    await ImportantInformationAboutSharedWalletsModal.checkbox.waitForEnabled();
    await ImportantInformationAboutSharedWalletsModal.checkboxLabel.waitForDisplayed();
    expect(await ImportantInformationAboutSharedWalletsModal.checkboxLabel.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.importantInfo.checkBoxLabel')
    );
    await ImportantInformationAboutSharedWalletsModal.backButton.waitForDisplayed();
    expect(await ImportantInformationAboutSharedWalletsModal.backButton.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.importantInfo.button.back')
    );
    await ImportantInformationAboutSharedWalletsModal.continueButton.waitForDisplayed();
    expect(await ImportantInformationAboutSharedWalletsModal.continueButton.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.importantInfo.button.next')
    );
  }
}

export default new ImportantInformationAboutSharedWalletsModalAssert();
