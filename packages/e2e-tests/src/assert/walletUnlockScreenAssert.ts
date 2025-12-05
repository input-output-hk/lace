import WalletUnlockPage from '../elements/walletUnlockPage';
import { t } from '../utils/translationService';
import { expect } from 'chai';

class WalletUnlockScreenAssert {
  assertSeeWalletUnlockScreen = async () => {
    await WalletUnlockPage.mainImage.waitForDisplayed();
    await WalletUnlockPage.title.waitForDisplayed();
    expect(await WalletUnlockPage.title.getText()).to.equal(await t('unlock.sectionTitle'));
    await WalletUnlockPage.passwordInput.waitForDisplayed();
    await WalletUnlockPage.unlockButton.waitForDisplayed();
    expect(await WalletUnlockPage.unlockButton.getText()).to.equal(await t('unlock.button'));
    await WalletUnlockPage.forgotPassword.waitForDisplayed();
    expect(await WalletUnlockPage.forgotPassword.getText()).to.equal(await t('unlock.forgotPassword'));
  };

  assertSeeUnlockButtonEnabled = async (shouldBeEnabled: boolean) => {
    await WalletUnlockPage.unlockButton.waitForEnabled({ reverse: !shouldBeEnabled });
  };
}

export default new WalletUnlockScreenAssert();
