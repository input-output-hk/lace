import { t } from '../../utils/translationService';
import AnalyticsPage from '../../elements/onboarding/analyticsPage';
import { expect } from 'chai';
import { browser } from '@wdio/globals';
import OnboardingCommonAssert from './onboardingCommonAssert';

class OnboardingDataCollectionPageAssert extends OnboardingCommonAssert {
  async assertSeeDataCollectionPage() {
    // isDisplayedInViewport() is used due to https://input-output.atlassian.net/browse/LW-4647
    expect(await AnalyticsPage.title.isDisplayedInViewport(), 'Title is not displayed in viewport!').to.be.true;
    await this.assertSeeStepTitle(await t('core.walletSetupAnalyticsStep.title'));

    expect(await AnalyticsPage.description.isDisplayedInViewport(), 'Description is not displayed in viewport!').to.be
      .true;
    const expectedDescription = `${await t('core.walletSetupAnalyticsStep.description')} ${await t(
      'core.walletSetupAnalyticsStep.privacyPolicy'
    )}`;
    expect(await AnalyticsPage.description.getText()).to.equal(expectedDescription);
    expect(
      await AnalyticsPage.privacyPolicyLinkWithinDescription.isDisplayedInViewport(),
      'Privacy policy link is not displayed in viewport!'
    ).to.be.true;
    expect(await AnalyticsPage.privacyPolicyLinkWithinDescription.getAttribute('href')).to.equal(
      'https://www.lace.io/iog-privacy-policy.pdf'
    );
    expect(
      await AnalyticsPage.privacyPolicyLinkWithinDescription.isClickable(),
      'Privacy policy link is not clickable!'
    ).to.be.true;

    expect(await AnalyticsPage.optionsTitle.isDisplayedInViewport(), 'Options title is not displayed in viewport!').to
      .be.true;
    expect(await AnalyticsPage.optionsTitle.getText()).to.equal(await t('core.walletSetupAnalyticsStep.optionsTitle'));

    expect(
      await AnalyticsPage.optionsAllowOptoutIcon.isDisplayedInViewport(),
      'Allow optout icon is not displayed in viewport!'
    ).to.be.true;
    expect(
      await AnalyticsPage.optionsAllowOptoutText.isDisplayedInViewport(),
      'Allow optout text is not displayed in viewport!'
    ).to.be.true;
    expect(await AnalyticsPage.optionsAllowOptoutText.getText()).to.equal(
      await t('core.walletSetupAnalyticsStep.allowOptout')
    );

    expect(
      await AnalyticsPage.optionsCollectPrivateKeysIcon.isDisplayedInViewport(),
      'Collect private keys icon is not displayed in viewport!'
    ).to.be.true;
    expect(
      await AnalyticsPage.optionsCollectPrivateKeysText.isDisplayedInViewport(),
      'Collect private keys text is not displayed in viewport!'
    ).to.be.true;
    expect(await AnalyticsPage.optionsCollectPrivateKeysText.getText()).to.equal(
      await t('core.walletSetupAnalyticsStep.collectPrivateKeys')
    );

    expect(
      await AnalyticsPage.optionsCollectIPIcon.isDisplayedInViewport(),
      'Collect IP icon is not displayed in viewport!'
    ).to.be.true;
    expect(
      await AnalyticsPage.optionsCollectIPText.isDisplayedInViewport(),
      'Collect IP text is not displayed in viewport!'
    ).to.be.true;
    expect(await AnalyticsPage.optionsCollectIPText.getText()).to.equal(
      await t('core.walletSetupAnalyticsStep.collectIp')
    );

    expect(
      await AnalyticsPage.optionsPersonalDataIcon.isDisplayedInViewport(),
      'Collect personal data icon is not displayed in viewport!'
    ).to.be.true;
    expect(
      await AnalyticsPage.optionsPersonalDataText.isDisplayedInViewport(),
      'Collect personal data text is not displayed in viewport!'
    ).to.be.true;
    expect(await AnalyticsPage.optionsPersonalDataText.getText()).to.equal(
      await t('core.walletSetupAnalyticsStep.personalData')
    );

    expect(await AnalyticsPage.backButton.isDisplayedInViewport(), 'Back button is not displayed in viewport!').to.be
      .true;
    expect(await AnalyticsPage.backButton.getText()).to.equal(await t('core.walletSetupAnalyticsStep.back'));
    expect(await AnalyticsPage.skipButton.isDisplayedInViewport(), 'Skip button is not displayed in viewport!').to.be
      .true;
    expect(await AnalyticsPage.skipButton.getText()).to.equal('Skip'); // https://input-output.atlassian.net/browse/LW-3717
    expect(await AnalyticsPage.nextButton.isDisplayedInViewport(), 'Confirm button is not displayed in viewport!').to.be
      .true;
    expect(await AnalyticsPage.nextButton.getText()).to.equal(await t('core.walletSetupAnalyticsStep.agree'));

    await this.assertSeeLegalLinks();
    await this.assertSeeHelpAndSupportButton();
  }

  async assertSeePrivacyPolicy() {
    const currentUrl = await browser.getUrl();
    expect(currentUrl).to.contain('https://www.lace.io/iog-privacy-policy.pdf');
  }
}

export default new OnboardingDataCollectionPageAssert();
