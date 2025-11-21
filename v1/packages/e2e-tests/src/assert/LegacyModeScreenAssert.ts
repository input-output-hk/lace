import WalletLockPage from '../elements/walletLockPage';
import { expect } from 'chai';
import { t } from '../utils/translationService';

class LegacyModeScreenAssert {
  async assertSeeLegacyModeScreen() {
    await WalletLockPage.laceLogo.waitForDisplayed();
    await WalletLockPage.helpAndSupportButton.waitForDisplayed();
    expect(await WalletLockPage.helpAndSupportButton.getText()).to.equal(await t('general.lock.helpAndSupport'));
    await WalletLockPage.mainImg.waitForDisplayed();
    await WalletLockPage.text1.waitForDisplayed();
    expect(await WalletLockPage.text1.getText()).to.equal(await t('general.lock.namiMode.message'));
    await WalletLockPage.text2.waitForDisplayed();
    const expectedDescription = (await t('general.lock.namiMode.description'))
      .replaceAll('<0>', '')
      .replaceAll('</0>', '')
      .replaceAll('<br />', '\n')
      .replaceAll(/\s{2,}/g, ' ');
    expect(await WalletLockPage.text2.getText()).to.equal(expectedDescription);
  }
}

export default new LegacyModeScreenAssert();
