import OnboardingCommonAssert from './onboardingCommonAssert';
import { TimelineSteps } from '../../enums/Onboarding';
import { t } from '../../utils/translationService';
import SecureYourPaperWalletPage from '../../elements/onboarding/SecureYourPaperWalletPage';
import { expect } from 'chai';

class SecureYourPaperWalletPageAssert extends OnboardingCommonAssert {
  async assertSeeSecureYourPaperWalletPage() {
    await this.assertSeeStepTitle(await t('paperWallet.securePaperWallet.title'));
    await this.assertSeeStepSubtitle(await t('paperWallet.securePaperWallet.description'));
    await this.assertSeeActiveStepOnProgressTimeline(TimelineSteps.RECOVERY_SETUP);

    await SecureYourPaperWalletPage.pgpKeyNameInputLabel.waitForDisplayed();
    expect(await SecureYourPaperWalletPage.pgpKeyNameInputLabel.getText()).to.equal(
      await t('core.paperWallet.securePaperWallet.pgpPublicKeyReference')
    );
    await SecureYourPaperWalletPage.pgpKeyNameInput.waitForDisplayed();
    await SecureYourPaperWalletPage.yourPublicPgpKeyBlockInputLabel.waitForDisplayed();
    expect(await SecureYourPaperWalletPage.yourPublicPgpKeyBlockInputLabel.getText()).to.equal(
      await t('core.paperWallet.securePaperWallet.pgpPublicKeyLabel')
    );
    await SecureYourPaperWalletPage.yourPublicPgpKeyBlockInput.waitForDisplayed();

    await this.assertSeeBackButton();
    await this.assertNextButtonTextEquals(await t('core.walletSetupStep.next'));
    await this.assertSeeHelpAndSupportButton();
    await this.assertSeeLegalLinks();
  }

  async assertSeeFingerprint(expectedFingerprint: string) {
    await SecureYourPaperWalletPage.fingerprintIcon.waitForDisplayed();
    await SecureYourPaperWalletPage.fingerprintText.waitForDisplayed();
    expect(await SecureYourPaperWalletPage.fingerprintText.getText()).to.equal(expectedFingerprint);
  }

  async assertSeeErrorMessage(expectedErrorType: 'malformed' | 'private' | 'too weak') {
    let translationKey;
    switch (expectedErrorType) {
      case 'malformed':
        translationKey = 'pgp.error.misformedArmoredText';
        break;
      case 'private':
        translationKey = 'pgp.error.privateKeySuppliedInsteadOfPublic';
        break;
      case 'too weak':
        translationKey = 'pgp.error.rsaKeyTooWeak';
        break;
      default:
        throw new Error(`Unsupported error type: ${expectedErrorType}`);
    }
    await SecureYourPaperWalletPage.validationError.waitForDisplayed();
    expect(await SecureYourPaperWalletPage.validationError.getText()).to.equal(await t(translationKey));
  }

  async assertPgpKeyName(expectedPgpKeyName: string) {
    expect(await SecureYourPaperWalletPage.pgpKeyNameInput.getValue()).to.equal(expectedPgpKeyName);
  }

  async assertPublicPgpKey(expectedPublicPgpKey: string) {
    await SecureYourPaperWalletPage.yourPublicPgpKeyBlockInput.waitForStable();
    expect(await SecureYourPaperWalletPage.yourPublicPgpKeyBlockInput.getValue()).to.equal(expectedPublicPgpKey.trim());
  }
}

export default new SecureYourPaperWalletPageAssert();
