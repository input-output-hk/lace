import ConnectYourDevicePage from '../../elements/onboarding/ConnectYourDevicePage';
import { t } from '../../utils/translationService';
import { expect } from 'chai';
import OnboardingCommonAssert from './onboardingCommonAssert';

class ConnectYourDevicePageAssert extends OnboardingCommonAssert {
  async assertSeeConnectYourDevicePage() {
    await this.assertSeeStepTitle(await t('core.walletSetupConnectHardwareWalletStepRevamp.title'));
    // TODO: replace subtitle assertions when USE_TREZOR_HW=true
    // await this.assertSeeStepSubtitle(await t('core.walletSetupConnectHardwareWalletStepRevamp.subTitle'));
    await this.assertSeeStepSubtitle(await t('core.walletSetupConnectHardwareWalletStepRevamp.subTitleLedgerOnly'));

    await ConnectYourDevicePage.loader.waitForDisplayed();

    await this.assertSeeBackButton();
    await this.assertSeeTryAgainButton(false);

    await this.assertSeeLegalLinks();
    await this.assertSeeHelpAndSupportButton();
  }

  async assertSeeError(expectedErrorMessage: string) {
    await ConnectYourDevicePage.errorImage.waitForDisplayed();
    await ConnectYourDevicePage.banner.container.waitForDisplayed();
    expect(await ConnectYourDevicePage.banner.description.getText()).to.equal(expectedErrorMessage);
  }

  async assertSeeTryAgainButton(shouldBeVisible: boolean) {
    await ConnectYourDevicePage.tryAgainButton.waitForDisplayed({ reverse: !shouldBeVisible });
    if (shouldBeVisible) {
      expect(await ConnectYourDevicePage.tryAgainButton.getText()).to.equal(
        await t('core.walletSetupConnectHardwareWalletStepRevamp.errorCta')
      );
    }
  }

  async assertSeeTryAgainButtonEnabled(shouldBeEnabled: boolean) {
    await ConnectYourDevicePage.tryAgainButton.waitForEnabled({ reverse: !shouldBeEnabled });
  }
}

export default new ConnectYourDevicePageAssert();
