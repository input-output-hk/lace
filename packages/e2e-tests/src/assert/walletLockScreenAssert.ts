import WalletLockPage from '../elements/walletLockPage';
import { t } from '../utils/translationService';
import { expect } from 'chai';

class WalletLockScreenAssert {
  async assertSeeWalletLockScreen() {
    await WalletLockPage.laceLogo.waitForDisplayed();
    await WalletLockPage.helpAndSupportButton.waitForDisplayed();
    expect(await WalletLockPage.helpAndSupportButton.getText()).to.equal(await t('general.lock.helpAndSupport'));
    await WalletLockPage.mainImg.waitForDisplayed();
    await WalletLockPage.text1.waitForDisplayed();
    expect(await WalletLockPage.text1.getText()).to.equal(await t('general.lock.yourWalletIsLocked'));
    await WalletLockPage.text2.waitForDisplayed();
    expect(await WalletLockPage.text2.getText()).to.equal(await t('general.lock.toUnlockOpenPopUp'));
  }
}

export default new WalletLockScreenAssert();
