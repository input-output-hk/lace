import LetsFindYourSharedWalletScreen from '../../elements/sharedWallet/LetsFindYourSharedWalletScreen';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class LetsFindYourSharedWalletScreenAssert {
  async assertSeeCopySharedWalletKeyScreen() {
    await LetsFindYourSharedWalletScreen.closeButton.waitForDisplayed();
    await LetsFindYourSharedWalletScreen.title.waitForDisplayed();
    expect(await LetsFindYourSharedWalletScreen.title.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.import.title')
    );
    await LetsFindYourSharedWalletScreen.subtitle.waitForDisplayed();
    expect(await LetsFindYourSharedWalletScreen.subtitle.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.import.subtitle')
    );
    await LetsFindYourSharedWalletScreen.uploadComponent.waitForDisplayed();
    // TODO: add more assertions when https://github.com/input-output-hk/lace/pull/1850 is merged
    await LetsFindYourSharedWalletScreen.backButton.waitForDisplayed();
    expect(await LetsFindYourSharedWalletScreen.backButton.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.layout.defaultBackButtonLabel')
    );
    await LetsFindYourSharedWalletScreen.openWalletButton.waitForDisplayed();
    expect(await LetsFindYourSharedWalletScreen.openWalletButton.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.import.next')
    );
  }
}

export default new LetsFindYourSharedWalletScreenAssert();
