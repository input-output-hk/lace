import ShareWalletDetailsScreen from '../../elements/sharedWallet/ShareWalletDetailsScreen';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class ShareWalletDetailsScreenAssert {
  async assertSeeScreen() {
    await ShareWalletDetailsScreen.title.waitForDisplayed();
    expect(await ShareWalletDetailsScreen.title.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.shareWalletDetails.title')
    );
    await ShareWalletDetailsScreen.subtitle.waitForDisplayed();
    expect(await ShareWalletDetailsScreen.subtitle.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.shareWalletDetails.subtitle')
    );
    await ShareWalletDetailsScreen.downloadNotice.waitForDisplayed();
    expect(await ShareWalletDetailsScreen.downloadNotice.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.shareWalletDetails.body')
    );
    await ShareWalletDetailsScreen.downloadButton.waitForDisplayed();
    expect(await ShareWalletDetailsScreen.downloadButton.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.shareWalletDetails.download')
    );
    await ShareWalletDetailsScreen.configFileLabel.waitForDisplayed();
    expect(await ShareWalletDetailsScreen.configFileLabel.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.shareWalletDetails.label')
    );
    await ShareWalletDetailsScreen.configFilePath.waitForDisplayed();
    expect(await ShareWalletDetailsScreen.configFilePath.getText()).to.equal('shared-wallet-config.json');
    await ShareWalletDetailsScreen.openSharedWalletButton.waitForDisplayed();
    expect(await ShareWalletDetailsScreen.openSharedWalletButton.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.shareWalletDetails.next')
    );
  }
}

export default new ShareWalletDetailsScreenAssert();
