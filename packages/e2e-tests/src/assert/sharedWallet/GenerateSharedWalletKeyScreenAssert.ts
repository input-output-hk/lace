import GenerateSharedWalletKeyScreen from '../../elements/sharedWallet/GenerateSharedWalletKeyScreen';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class GenerateSharedWalletKeyScreenAssert {
  async assertSeeGenerateSharedWalletKeyScreen() {
    await GenerateSharedWalletKeyScreen.closeButton.waitForDisplayed();
    await GenerateSharedWalletKeyScreen.title.waitForDisplayed();
    expect(await GenerateSharedWalletKeyScreen.title.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.keyGeneration.enterPassword.title')
    );
    await GenerateSharedWalletKeyScreen.subtitle.waitForDisplayed();
    expect(await GenerateSharedWalletKeyScreen.subtitle.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.keyGeneration.enterPassword.subtitle')
    );
    await GenerateSharedWalletKeyScreen.walletIcon.waitForDisplayed();
    await GenerateSharedWalletKeyScreen.walletType.waitForDisplayed();
    expect(await GenerateSharedWalletKeyScreen.walletType.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.keyGeneration.enterPassword.activeWalletLabel')
    );
    await GenerateSharedWalletKeyScreen.walletName.waitForDisplayed();
    await GenerateSharedWalletKeyScreen.passwordInput.waitForDisplayed();
    await GenerateSharedWalletKeyScreen.backButton.waitForDisplayed();
    expect(await GenerateSharedWalletKeyScreen.backButton.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.layout.defaultBackButtonLabel')
    );
    await GenerateSharedWalletKeyScreen.generateKeyButton.waitForDisplayed();
    expect(await GenerateSharedWalletKeyScreen.generateKeyButton.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.keyGeneration.enterPassword.nextButtonLabel')
    );
  }
}

export default new GenerateSharedWalletKeyScreenAssert();
