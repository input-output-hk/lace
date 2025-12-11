import BitcoinWarningModal from '../../elements/onboarding/BitcoinWarningModal';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class BitcoinWarningModalAssert {
  async assertSeeModal(shouldBeDisplayed: boolean) {
    await BitcoinWarningModal.container.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      await BitcoinWarningModal.title.waitForDisplayed();
      expect(await BitcoinWarningModal.title.getText()).to.equal(
        await t('core.walletSetupOptionsStep.infoMessageTitle')
      );
      await BitcoinWarningModal.description.waitForDisplayed();
      expect(await BitcoinWarningModal.description.getText()).to.equal(
        await t('core.walletSetupOptionsStep.infoMessage')
      );
      await BitcoinWarningModal.cancelButton.waitForDisplayed();
      expect(await BitcoinWarningModal.cancelButton.getText()).to.equal(await t('general.button.cancel'));
      await BitcoinWarningModal.understoodButton.waitForDisplayed();
      expect(await BitcoinWarningModal.understoodButton.getText()).to.equal(await t('general.button.understood'));
    }
  }
}

export default new BitcoinWarningModalAssert();
