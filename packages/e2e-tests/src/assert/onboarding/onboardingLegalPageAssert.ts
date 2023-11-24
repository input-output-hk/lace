import OnboardingLegalPage from '../../elements/onboarding/legalPage';
import { t } from '../../utils/translationService';
import { expect } from 'chai';
import OnboardingCommonAssert from './onboardingCommonAssert';
import { removeWhitespacesFromText } from '../../utils/textUtils';
import { readFromFile } from '../../utils/fileUtils';

class OnboardingLegalPageAssert extends OnboardingCommonAssert {
  async assertSeeLegalPageText() {
    await OnboardingLegalPage.legalText.waitForDisplayed();
    const expectedTerms = await removeWhitespacesFromText(
      readFromFile(__dirname, '../settings/termsAndConditions.txt')
    );
    const actualTerms = await removeWhitespacesFromText(
      (await OnboardingLegalPage.legalText.getText()).replace('I accept the Terms of Use', '')
    );
    expect(actualTerms).to.equal(expectedTerms);
  }

  async assertSeeTermsAndConditionsConfirmation() {
    await OnboardingLegalPage.termsCheckbox.scrollIntoView();
    await OnboardingLegalPage.termsCheckbox.waitForEnabled();
    await OnboardingLegalPage.termsCheckboxDescription.waitForDisplayed();
    expect(await OnboardingLegalPage.termsCheckboxDescription.getText()).to.equal('I accept the Terms of Use');
  }

  async assertSeeLegalPage() {
    await this.assertSeeStepTitle(await t('core.walletSetupLegalStep.title'));
    await this.assertSeeLegalPageText();
    await this.assertSeeTermsAndConditionsConfirmation();
    await this.assertSeeBackButton();
    await this.assertSeeNextButton();
    await this.assertSeeLegalLinks();
    await this.assertSeeHelpAndSupportButton();
  }

  async assertNoTooltipVisible() {
    await OnboardingLegalPage.termsTooltip.waitForDisplayed({ reverse: true });
  }

  async assertTooltipVisible() {
    await OnboardingLegalPage.termsTooltip.waitForDisplayed();
    expect(await OnboardingLegalPage.termsTooltip.getText()).to.equal(await t('core.walletSetupLegalStep.toolTipText'));
  }
}

export default new OnboardingLegalPageAssert();
