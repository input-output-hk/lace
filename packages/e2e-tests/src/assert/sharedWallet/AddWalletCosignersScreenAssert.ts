import AddWalletCosignersScreen from '../../elements/sharedWallet/AddWalletCosignersScreen';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class AddWalletCosignersScreenAssert {
  async assertSeeAddWalletCosignersScreen() {
    await AddWalletCosignersScreen.title.waitForDisplayed();
    expect(await AddWalletCosignersScreen.title.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.addCosigners.title')
    );
    await AddWalletCosignersScreen.subtitle.waitForDisplayed();
    expect(await AddWalletCosignersScreen.subtitle.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.addCosigners.subtitle')
    );
    await AddWalletCosignersScreen.yourIdentifierLabel.waitForDisplayed();
    expect(await AddWalletCosignersScreen.yourIdentifierLabel.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.addCosigners.yourNameInputLabel')
    );
    await AddWalletCosignersScreen.yourIdentifierInput.waitForEnabled();
    await AddWalletCosignersScreen.yourSharedWalletKeyLabel.waitForDisplayed();
    expect(await AddWalletCosignersScreen.yourSharedWalletKeyLabel.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.addCosigners.yourKeysInputLabel')
    );
    await AddWalletCosignersScreen.yourSharedWalletKeyInput.waitForEnabled({ reverse: true });
    await AddWalletCosignersScreen.cosigner1IdentifierLabel.waitForDisplayed();
    expect(await AddWalletCosignersScreen.cosigner1IdentifierLabel.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.addCosigners.coSignerNameInputLabel')
    );
    await AddWalletCosignersScreen.cosigner1IdentifierInput.waitForEnabled();
    await AddWalletCosignersScreen.cosigner1SharedWalletKeyLabel.waitForDisplayed();
    expect(await AddWalletCosignersScreen.cosigner1SharedWalletKeyLabel.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.addCosigners.coSignerKeysInputLabel')
    );
    await AddWalletCosignersScreen.cosigner1SharedWalletKeyInput.waitForEnabled();
    await AddWalletCosignersScreen.cosigner2IdentifierLabel.waitForDisplayed();
    expect(await AddWalletCosignersScreen.cosigner2IdentifierLabel.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.addCosigners.coSignerNameInputLabel')
    );
    await AddWalletCosignersScreen.cosigner2IdentifierInput.waitForEnabled();
    await AddWalletCosignersScreen.cosigner2SharedWalletKeyLabel.waitForDisplayed();
    expect(await AddWalletCosignersScreen.cosigner2SharedWalletKeyLabel.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.addCosigners.coSignerKeysInputLabel')
    );
    await AddWalletCosignersScreen.cosigner2SharedWalletKeyInput.waitForEnabled();
  }
}

export default new AddWalletCosignersScreenAssert();
