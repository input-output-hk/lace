import Modal from '../elements/modal';
import { expect } from 'chai';
import { t } from '../utils/translationService';

class ModalAssert {
  async assertSeeModalContainer(shouldSee: boolean) {
    await Modal.container.waitForDisplayed({ reverse: !shouldSee });
  }

  async assertSeeTitle(expectedTitle: string) {
    await Modal.title.waitForDisplayed();
    expect(await Modal.title.getText()).to.equal(expectedTitle);
  }

  async assertSeeDescription(expectedDescription: string) {
    await Modal.description.waitForDisplayed();
    expect(await Modal.description.getText()).to.equal(expectedDescription);
  }

  async assertSeeCancelButton(label: string) {
    await Modal.cancelButton.waitForDisplayed();
    expect(await Modal.cancelButton.getText()).to.equal(label);
  }

  async assertSeeConfirmButton(label: string) {
    await Modal.confirmButton.waitForDisplayed();
    expect(await Modal.confirmButton.getText()).to.equal(label);
  }

  async assertSeeModal(title: string, description: string, cancelButtonLabel: string, confirmButtonLabel: string) {
    await this.assertSeeModalContainer(true);
    await this.assertSeeTitle(title);
    await this.assertSeeDescription(description);
    await this.assertSeeCancelButton(cancelButtonLabel);
    await this.assertSeeConfirmButton(confirmButtonLabel);
  }

  async assertSeeRemoveWalletModal(shouldBeDisplayed: boolean) {
    if (shouldBeDisplayed) {
      const title = await t('browserView.settings.wallet.general.removeWalletAlert.title');
      const description = await t('browserView.settings.wallet.general.removeWalletAlert.content');
      const cancelButtonLabel = await t('browserView.settings.wallet.general.removeWalletAlert.cancel');
      const confirmButtonLabel = await t('browserView.settings.wallet.general.removeAction');
      await this.assertSeeModal(title, description, cancelButtonLabel, confirmButtonLabel);
    } else {
      await this.assertSeeModalContainer(false);
    }
  }

  async assertSeeOnboardingStartAgainModal(shouldBeDisplayed: boolean) {
    if (shouldBeDisplayed) {
      const title = await t('browserView.walletSetup.mnemonicResetModal.header');
      const description = await t('browserView.walletSetup.mnemonicResetModal.content');
      const cancelButtonLabel = await t('browserView.walletSetup.mnemonicResetModal.cancel');
      const confirmButtonLabel = await t('browserView.walletSetup.mnemonicResetModal.confirm');
      await this.assertSeeModal(title, description, cancelButtonLabel, confirmButtonLabel);
    } else {
      await this.assertSeeModalContainer(false);
    }
  }
}

export default new ModalAssert();
