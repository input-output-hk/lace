import DefineWalletQuorumScreen from '../../elements/sharedWallet/DefineWalletQuorumScreen';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class DefineWalletQuorumScreenAssert {
  async assertSeeScreen() {
    await DefineWalletQuorumScreen.title.waitForDisplayed();
    expect(await DefineWalletQuorumScreen.title.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.quorum.title')
    );
    await DefineWalletQuorumScreen.subtitle.waitForDisplayed();
    expect(await DefineWalletQuorumScreen.subtitle.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.quorum.description')
    );
    await DefineWalletQuorumScreen.allAddressesComponent.waitForDisplayed();
    await DefineWalletQuorumScreen.allAddressesRadio.waitForEnabled();
    await DefineWalletQuorumScreen.allAddressesLabel.waitForDisplayed();
    expect(await DefineWalletQuorumScreen.allAddressesLabel.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.quorum.optionAll')
    );
    await DefineWalletQuorumScreen.someAddressesComponent.waitForDisplayed();
    await DefineWalletQuorumScreen.someAddressesRadio.waitForEnabled();
    await DefineWalletQuorumScreen.someAddressesLabel.waitForDisplayed();
    expect(await DefineWalletQuorumScreen.someAddressesLabel.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.quorum.optionSome')
    );
    await DefineWalletQuorumScreen.cosignersDropdownTrigger.waitForDisplayed();
    expect(await DefineWalletQuorumScreen.cosignersDropdownTrigger.getText()).to.equal('1');
    await DefineWalletQuorumScreen.cosignersTotalSignaturesLabel.waitForDisplayed();
    const expectedCosignerAmountPickerText = (
      await t('sharedWallets.addSharedWallet.quorum.cosignersAmountPickerText')
    ).replace('{{amount}}', '3');
    expect(await DefineWalletQuorumScreen.cosignersTotalSignaturesLabel.getText()).to.equal(
      expectedCosignerAmountPickerText
    );

    await DefineWalletQuorumScreen.backButton.waitForDisplayed();
    expect(await DefineWalletQuorumScreen.backButton.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.quorum.button.back')
    );
    await DefineWalletQuorumScreen.nextButton.waitForDisplayed();
    expect(await DefineWalletQuorumScreen.nextButton.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.layout.defaultNextButtonLabel')
    );
  }
}

export default new DefineWalletQuorumScreenAssert();
