import OnboardingCommonAssert from './onboardingCommonAssert';
import ConfirmPasswordPage from '../../elements/onboarding/ConfirmPasswordPage';
import { t } from '../../utils/translationService';
import { expect } from 'chai';

class ConfirmPasswordPageAssert extends OnboardingCommonAssert {
  async assertSeeConfirmPasswordPage(walletName: string) {
    await ConfirmPasswordPage.stepTitle.waitForDisplayed();
    expect(await ConfirmPasswordPage.stepTitle.getText()).to.equal(
      await t('core.walletSetupReuseRecoveryPhrase.confirmPassword')
    );
    await ConfirmPasswordPage.stepSubtitle.waitForDisplayed();
    const expectedSubtitle = (await t('core.walletSetupReuseRecoveryPhrase.confirmPasswordDescription'))
      .replace('<b>', '')
      .replace('</b>', '')
      .replace('{{walletName}}', walletName);
    expect(await ConfirmPasswordPage.stepSubtitle.getText()).to.equal(expectedSubtitle);
    await ConfirmPasswordPage.passwordInput.waitForDisplayed();

    await this.assertSeeBackButton();

    await ConfirmPasswordPage.nextButton.waitForDisplayed();
    expect(await ConfirmPasswordPage.nextButton.getText()).to.equal(
      await t('core.walletSetupReuseRecoveryPhrase.confirm')
    );
  }

  async assertConfirmButtonIsEnabled(shouldBeEnabled: boolean) {
    await ConfirmPasswordPage.nextButton.waitForEnabled({ reverse: !shouldBeEnabled });
  }

  async assertSeePasswordError() {
    await ConfirmPasswordPage.passwordError.waitForDisplayed();
    expect(await ConfirmPasswordPage.passwordError.getText()).to.equal(await t('general.errors.invalidPassword'));
  }
}

export default new ConfirmPasswordPageAssert();
