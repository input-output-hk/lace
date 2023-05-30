import Modal from '../elements/modal';
import { expect } from 'chai';
import { t } from '../utils/translationService';

class ModalAssert {
  async assertSeeContainer() {
    await Modal.container.waitForDisplayed();
  }

  async assertSeeTitle(expectedTitle: string) {
    await Modal.title.waitForDisplayed();
    await expect(await Modal.title.getText()).to.equal(expectedTitle);
  }

  async assertSeeDescription(expectedDescription: string) {
    await Modal.description.waitForDisplayed();
    await expect(await Modal.description.getText()).to.equal(expectedDescription);
  }

  async assertSeeCancelButton(label: string) {
    await Modal.cancelButton.waitForDisplayed();
    await expect(await Modal.cancelButton.getText()).to.equal(label);
  }

  async assertSeeConfirmButton(label: string) {
    await Modal.confirmButton.waitForDisplayed();
    await expect(await Modal.confirmButton.getText()).to.equal(label);
  }

  async assertSeeModal(title: string, description: string, cancelButtonLabel: string, confirmButtonLabel: string) {
    await this.assertSeeContainer();
    await this.assertSeeTitle(title);
    await this.assertSeeDescription(description);
    await this.assertSeeCancelButton(cancelButtonLabel);
    await this.assertSeeConfirmButton(confirmButtonLabel);
  }

  async assertSeeRestoringMultiAddressWalletModal() {
    const title = await t('browserView.walletSetup.confirmRestoreModal.header');
    const description = await t('browserView.walletSetup.confirmRestoreModal.notVisible');
    const cancelButtonLabel = await t('general.button.cancel');
    const confirmButtonLabel = await t('browserView.walletSetup.confirmRestoreModal.confirm');

    await this.assertSeeModal(title, description, cancelButtonLabel, confirmButtonLabel);
  }
}

export default new ModalAssert();
