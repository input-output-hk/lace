import CopySharedWalletKeyScreen from '../../elements/sharedWallet/CopySharedWalletKeyScreen';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class CopySharedWalletKeyScreenAssert {
  async assertSeeCopySharedWalletKeyScreen(expectedKeyValue: string) {
    await CopySharedWalletKeyScreen.closeButton.waitForDisplayed();
    await CopySharedWalletKeyScreen.title.waitForDisplayed();
    expect(await CopySharedWalletKeyScreen.title.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.keyGeneration.copyKeys.title')
    );
    await CopySharedWalletKeyScreen.subtitle.waitForDisplayed();
    expect(await CopySharedWalletKeyScreen.subtitle.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.keyGeneration.copyKeys.subtitle')
    );
    await CopySharedWalletKeyScreen.sharedWalletKeysLabel.waitForDisplayed();
    expect(await CopySharedWalletKeyScreen.sharedWalletKeysLabel.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.keyGeneration.copyKeys.keyBoxTitle')
    );
    await CopySharedWalletKeyScreen.sharedWalletKeysValue.waitForDisplayed();
    expect(await CopySharedWalletKeyScreen.sharedWalletKeysValue.getText()).to.equal(expectedKeyValue);
    await CopySharedWalletKeyScreen.copyKeyToClipboardButton.waitForDisplayed();
    expect(await CopySharedWalletKeyScreen.copyKeyToClipboardButton.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.keyGeneration.copyKeys.backButtonLabel')
    );
    await CopySharedWalletKeyScreen.footerCloseButton.waitForDisplayed();
    expect(await CopySharedWalletKeyScreen.footerCloseButton.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.keyGeneration.copyKeys.nextButtonLabel')
    );
  }
}

export default new CopySharedWalletKeyScreenAssert();
