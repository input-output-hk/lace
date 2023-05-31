import ForgotPasswordModal from '../elements/ForgotPasswordModal';
import { expect } from 'chai';
import { t } from '../utils/translationService';

class ForgotPasswordModalAssert {
  async assertSeeForgotPasswordModal() {
    await ForgotPasswordModal.title.waitForDisplayed();
    await expect(await ForgotPasswordModal.title.getText()).to.equal(await t('forgotPassword.title'));
    await ForgotPasswordModal.description.waitForDisplayed();
    await expect(await ForgotPasswordModal.description.getText()).to.equal(await t('forgotPassword.description'));
    await ForgotPasswordModal.confirmButton.waitForDisplayed();
    await expect(await ForgotPasswordModal.confirmButton.getText()).to.equal(await t('forgotPassword.confirm'));
    await ForgotPasswordModal.cancelButton.waitForDisplayed();
    await expect(await ForgotPasswordModal.cancelButton.getText()).to.equal(await t('forgotPassword.cancel'));
  }
}

export default new ForgotPasswordModalAssert();
