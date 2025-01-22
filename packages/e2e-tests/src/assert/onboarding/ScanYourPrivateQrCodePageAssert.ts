import ScanYourPrivateQrCodePage from '../../elements/onboarding/ScanYourPrivateQrCodePage';
import { expect } from 'chai';
import { t } from '../../utils/translationService';
import OnboardingCommonAssert from './onboardingCommonAssert';
import { TimelineSteps } from '../../enums/Onboarding';

class ScanYourPrivateQrCodePageAssert extends OnboardingCommonAssert {
  async assertSeeScanYourPrivateQrCodePage(permission: 'granted' | 'denied' | 'prompted') {
    await this.assertSeeStepTitle(await t('paperWallet.scanShieldedMessage.title'));
    const expectedDescription = (await t('paperWallet.scanShieldedMessage.description'))
      .replace('<strong>', '')
      .replace('</strong>', '');
    await this.assertSeeStepSubtitle(expectedDescription);
    await this.assertSeeActiveStepOnProgressTimeline(TimelineSteps.RECOVERY_SETUP);

    if (permission === 'granted') {
      await ScanYourPrivateQrCodePage.cameraPreviewBox.waitForDisplayed();
      await ScanYourPrivateQrCodePage.loaderImage.waitForDisplayed();
      await ScanYourPrivateQrCodePage.loaderLabel.waitForDisplayed();
      expect(await ScanYourPrivateQrCodePage.loaderLabel.getText()).to.equal(
        await t('paperWallet.scanShieldedMessage.lookingForWallet')
      );
    }

    if (permission === 'denied') {
      await ScanYourPrivateQrCodePage.sadEmojiIcon.waitForDisplayed();
      await ScanYourPrivateQrCodePage.cameraAccessBlockedLabel.waitForDisplayed();
      expect(await ScanYourPrivateQrCodePage.cameraAccessBlockedLabel.getText()).to.equal(
        await t('paperWallet.scanShieldedMessage.cameraAccessBlocked')
      );
    }

    if (permission === 'prompted') {
      await ScanYourPrivateQrCodePage.cameraIcon.waitForDisplayed();
      await ScanYourPrivateQrCodePage.cameraAccessPromptLabel.waitForDisplayed();
      expect(await ScanYourPrivateQrCodePage.cameraAccessPromptLabel.getText()).to.equal(
        await t('paperWallet.scanShieldedMessage.waitingForCameraAccess')
      );
    }

    await this.assertSeeBackButton();
  }
}

export default new ScanYourPrivateQrCodePageAssert();
