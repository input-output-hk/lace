import ScanYourPrivateQrCodePage from '../../elements/onboarding/ScanYourPrivateQrCodePage';
import { expect } from 'chai';
import { t } from '../../utils/translationService';
import OnboardingCommonAssert from './onboardingCommonAssert';
import { TimelineSteps } from '../../enums/Onboarding';

class ScanYourPrivateQrCodePageAssert extends OnboardingCommonAssert {
  async assertSeeScanYourPrivateQrCodePage() {
    await this.assertSeeStepTitle(await t('paperWallet.scanShieldedMessage.title'));
    const expectedDescription = (await t('paperWallet.scanShieldedMessage.description'))
      .replace('<strong>', '')
      .replace('</strong>', '');
    await this.assertSeeStepSubtitle(expectedDescription);
    await this.assertSeeActiveStepOnProgressTimeline(TimelineSteps.RECOVERY_SETUP);

    await ScanYourPrivateQrCodePage.cameraPreviewBox.waitForDisplayed();
    await ScanYourPrivateQrCodePage.loaderImage.waitForDisplayed();
    await ScanYourPrivateQrCodePage.loaderLabel.waitForDisplayed();
    expect(await ScanYourPrivateQrCodePage.loaderLabel.getText()).to.equal(
      await t('paperWallet.scanShieldedMessage.lookingForWallet')
    );

    await this.assertSeeBackButton();
  }
}

export default new ScanYourPrivateQrCodePageAssert();
