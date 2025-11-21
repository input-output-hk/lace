import LetsCreateYourNewSharedWalletScreen from '../../elements/sharedWallet/LetsCreateYourNewSharedWalletScreen';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class LetsCreateYourNewSharedWalletScreenAssert {
  async asserSeeLetsCreateYourNewSharedWalletScreen(
    expectedLaceWalletName: string,
    expectedSharedWalletName: string
  ): Promise<void> {
    await LetsCreateYourNewSharedWalletScreen.closeButton.waitForDisplayed();
    await LetsCreateYourNewSharedWalletScreen.title.waitForDisplayed();
    expect(await LetsCreateYourNewSharedWalletScreen.title.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.setup.title')
    );
    await LetsCreateYourNewSharedWalletScreen.subtitle.waitForDisplayed();
    expect(await LetsCreateYourNewSharedWalletScreen.subtitle.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.setup.subtitle')
    );
    await LetsCreateYourNewSharedWalletScreen.sharedWalletNameLabel.waitForDisplayed();
    expect(await LetsCreateYourNewSharedWalletScreen.sharedWalletNameLabel.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.setup.inputLabel')
    );
    await LetsCreateYourNewSharedWalletScreen.sharedWalletNameInput.waitForDisplayed();
    expect(await LetsCreateYourNewSharedWalletScreen.sharedWalletNameInput.getValue()).to.equal(
      expectedSharedWalletName
    );
    await LetsCreateYourNewSharedWalletScreen.activeLaceWalletNotice.waitForDisplayed();
    expect(await LetsCreateYourNewSharedWalletScreen.activeLaceWalletNotice.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.setup.body')
    );
    await LetsCreateYourNewSharedWalletScreen.activeLaceWalletIcon.waitForDisplayed();
    await LetsCreateYourNewSharedWalletScreen.activeLaceWalletName.waitForDisplayed();
    expect(await LetsCreateYourNewSharedWalletScreen.activeLaceWalletName.getText()).to.equal(expectedLaceWalletName);
    await LetsCreateYourNewSharedWalletScreen.backButton.waitForDisplayed();
    expect(await LetsCreateYourNewSharedWalletScreen.backButton.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.layout.defaultBackButtonLabel')
    );
    await LetsCreateYourNewSharedWalletScreen.nextButton.waitForDisplayed();
    expect(await LetsCreateYourNewSharedWalletScreen.nextButton.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.layout.defaultNextButtonLabel')
    );
  }
}

export default new LetsCreateYourNewSharedWalletScreenAssert();
