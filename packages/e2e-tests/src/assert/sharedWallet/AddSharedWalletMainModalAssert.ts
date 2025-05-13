import { expect } from 'chai';
import { isPopupMode } from '../../utils/pageUtils';
import AddSharedWalletMainModal from '../../elements/sharedWallet/AddSharedWalletMainModal';
import { t } from '../../utils/translationService';

class AddSharedWalletMainModalAssert {
  async assertSeeOnboardingMainScreenInExtendedMode(isKeyGenerated: boolean) {
    expect(await isPopupMode()).to.be.false;
    await AddSharedWalletMainModal.container.waitForDisplayed({ timeout: 5000 });
    await AddSharedWalletMainModal.closeButton.waitForEnabled();
    await AddSharedWalletMainModal.logo.waitForDisplayed();
    await AddSharedWalletMainModal.title.waitForDisplayed();
    expect(await AddSharedWalletMainModal.title.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.getStarted.title')
    );
    await AddSharedWalletMainModal.subtitle.waitForDisplayed();
    expect(await AddSharedWalletMainModal.subtitle.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.getStarted.subTitle')
    );

    await (isKeyGenerated ? this.assertSeeCopySharedWalletKeySection() : this.assertSeeGenerateShareWalletKeySection());
    await this.assertSeeCreateSharedWalletSection();
    await this.assertSeeImportSharedWalletSection();
  }

  private async assertSeeImportSharedWalletSection() {
    await AddSharedWalletMainModal.importSharedWalletIcon.waitForDisplayed();
    await AddSharedWalletMainModal.importSharedWalletTitle.waitForDisplayed();
    expect(await AddSharedWalletMainModal.importSharedWalletTitle.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.getStarted.importSharedWalletOption.title')
    );
    await AddSharedWalletMainModal.importSharedWalletDescription.waitForDisplayed();
    expect(await AddSharedWalletMainModal.importSharedWalletDescription.getText()).to.equal(
      (await t('sharedWallets.addSharedWallet.getStarted.importSharedWalletOption.description')).replace('<br>', '\n')
    );
    await AddSharedWalletMainModal.importSharedWalletButton.waitForDisplayed();
    expect(await AddSharedWalletMainModal.importSharedWalletButton.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.getStarted.importSharedWalletOption.button')
    );
  }

  private async assertSeeCreateSharedWalletSection() {
    await AddSharedWalletMainModal.createSharedWalletIcon.waitForDisplayed();
    await AddSharedWalletMainModal.createSharedWalletTitle.waitForDisplayed();
    expect(await AddSharedWalletMainModal.createSharedWalletTitle.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.getStarted.createSharedWalletOption.title')
    );
    await AddSharedWalletMainModal.createSharedWalletDescription.waitForDisplayed();
    expect(await AddSharedWalletMainModal.createSharedWalletDescription.getText()).to.equal(
      (await t('sharedWallets.addSharedWallet.getStarted.createSharedWalletOption.description')).replace('<br>', '\n')
    );
    await AddSharedWalletMainModal.createSharedWalletButton.waitForDisplayed();
    expect(await AddSharedWalletMainModal.createSharedWalletButton.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.getStarted.createSharedWalletOption.button')
    );
  }

  private async assertSeeGenerateShareWalletKeySection() {
    await AddSharedWalletMainModal.generateSharedWalletKeyIcon.waitForDisplayed();
    await AddSharedWalletMainModal.generateSharedWalletKeyTitle.waitForDisplayed();
    expect(await AddSharedWalletMainModal.generateSharedWalletKeyTitle.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.getStarted.keyOption.title')
    );
    await AddSharedWalletMainModal.generateSharedWalletKeyDescription.waitForDisplayed();
    expect(await AddSharedWalletMainModal.generateSharedWalletKeyDescription.getText()).to.equal(
      (await t('sharedWallets.addSharedWallet.getStarted.keyOption.description')).replace('<br>', '\n')
    );
    await AddSharedWalletMainModal.generateSharedWalletKeyButton.waitForDisplayed();
    expect(await AddSharedWalletMainModal.generateSharedWalletKeyButton.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.getStarted.keyOption.button.generate')
    );
  }

  private async assertSeeCopySharedWalletKeySection() {
    await AddSharedWalletMainModal.copySharedWalletKeyIcon.waitForDisplayed();
    await AddSharedWalletMainModal.copySharedWalletKeyTitle.waitForDisplayed();
    expect(await AddSharedWalletMainModal.copySharedWalletKeyTitle.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.getStarted.keyOption.title')
    );
    await AddSharedWalletMainModal.copySharedWalletKeyDescription.waitForDisplayed();
    expect(await AddSharedWalletMainModal.copySharedWalletKeyDescription.getText()).to.equal(
      (await t('sharedWallets.addSharedWallet.getStarted.keyOption.description')).replace('<br>', '\n')
    );
    await AddSharedWalletMainModal.copySharedWalletKeyButton.waitForDisplayed();
    expect(await AddSharedWalletMainModal.copySharedWalletKeyButton.getText()).to.equal(
      await t('sharedWallets.addSharedWallet.getStarted.keyOption.button.copy')
    );
  }

  async assertGenerateWalletKeyOptionIsActive() {
    expect(await AddSharedWalletMainModal.generateSharedWalletKeyIcon.getCSSProperty('opacity')).haveOwnProperty(
      'value',
      1
    );
    expect(await AddSharedWalletMainModal.generateSharedWalletKeyTitle.getCSSProperty('opacity')).haveOwnProperty(
      'value',
      1
    );
    expect(await AddSharedWalletMainModal.generateSharedWalletKeyDescription.getCSSProperty('opacity')).haveOwnProperty(
      'value',
      1
    );
    await AddSharedWalletMainModal.generateSharedWalletKeyButton.waitForEnabled();
  }

  async assertCopySharedWalletOptionIsActive() {
    expect(await AddSharedWalletMainModal.copySharedWalletKeyIcon.getCSSProperty('opacity')).haveOwnProperty(
      'value',
      1
    );
    expect(await AddSharedWalletMainModal.copySharedWalletKeyTitle.getCSSProperty('opacity')).haveOwnProperty(
      'value',
      1
    );
    expect(await AddSharedWalletMainModal.copySharedWalletKeyDescription.getCSSProperty('opacity')).haveOwnProperty(
      'value',
      1
    );
    await AddSharedWalletMainModal.copySharedWalletKeyButton.waitForEnabled();
  }

  async assertCreateSharedWalletOptionStatus(isActive: boolean) {
    expect(await AddSharedWalletMainModal.createSharedWalletIcon.getCSSProperty('opacity')).haveOwnProperty(
      'value',
      isActive ? 1 : 0.4
    );
    expect(await AddSharedWalletMainModal.createSharedWalletTitle.getCSSProperty('opacity')).haveOwnProperty(
      'value',
      isActive ? 1 : 0.4
    );
    expect(await AddSharedWalletMainModal.createSharedWalletDescription.getCSSProperty('opacity')).haveOwnProperty(
      'value',
      isActive ? 1 : 0.4
    );
    await AddSharedWalletMainModal.createSharedWalletButton.waitForEnabled({ reverse: !isActive });
  }

  async assertImportSharedWalletOptionStatus(isActive: boolean) {
    expect(await AddSharedWalletMainModal.importSharedWalletIcon.getCSSProperty('opacity')).haveOwnProperty(
      'value',
      isActive ? 1 : 0.4
    );
    expect(await AddSharedWalletMainModal.importSharedWalletTitle.getCSSProperty('opacity')).haveOwnProperty(
      'value',
      isActive ? 1 : 0.4
    );
    expect(await AddSharedWalletMainModal.importSharedWalletDescription.getCSSProperty('opacity')).haveOwnProperty(
      'value',
      isActive ? 1 : 0.4
    );
    await AddSharedWalletMainModal.importSharedWalletButton.waitForEnabled({ reverse: !isActive });
  }
}

export default new AddSharedWalletMainModalAssert();
