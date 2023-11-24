import { t } from '../../utils/translationService';
import AllDonePage from '../../elements/onboarding/allDonePage';
import OnboardingCommonAssert from './onboardingCommonAssert';
import { expect } from 'chai';
import WalletCreationPage from '../../elements/onboarding/WalletCreationPage';

class OnboardingAllDonePageAssert extends OnboardingCommonAssert {
  async assertSeeAllDonePage() {
    // do not increase timeout below, 10s is max, LW-3437
    await WalletCreationPage.walletLoader.waitForDisplayed({ timeout: 10_000, reverse: true });
    await this.assertSeeStepTitle(await t('core.walletSetupFinalStep.title'));
    await this.assertSeeStepSubtitle(await t('core.walletSetupFinalStep.description'));

    await AllDonePage.twitterLinkIcon.waitForDisplayed();
    await AllDonePage.twitterLinkText.waitForDisplayed();
    expect(await AllDonePage.twitterLinkText.getText()).to.equal(await t('core.walletSetupFinalStep.followTwitter'));
    await AllDonePage.youtubeLinkIcon.waitForDisplayed();
    await AllDonePage.youtubeLinkText.waitForDisplayed();
    expect(await AllDonePage.youtubeLinkText.getText()).to.equal(await t('core.walletSetupFinalStep.followYoutube'));
    await AllDonePage.discordLinkIcon.waitForDisplayed();
    await AllDonePage.discordLinkText.waitForDisplayed();
    expect(await AllDonePage.discordLinkText.getText()).to.equal(await t('core.walletSetupFinalStep.followDiscord'));

    await AllDonePage.nextButton.waitForDisplayed();
    expect(await AllDonePage.nextButton.getText()).to.equal(await t('core.walletSetupFinalStep.close'));

    await this.assertSeeLegalLinks();
  }
}

export default new OnboardingAllDonePageAssert();
