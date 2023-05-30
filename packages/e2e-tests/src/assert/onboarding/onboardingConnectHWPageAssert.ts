import OnboardingConnectHardwareWalletPage from '../../elements/onboarding/connectHardwareWalletPage';
import { t } from '../../utils/translationService';
import { expect } from 'chai';
import OnboardingCommonAssert from './onboardingCommonAssert';

class OnboardingConnectHardwareWalletPageAssert extends OnboardingCommonAssert {
  async assertSeeConnectHardwareWalletPageSubTitle() {
    await OnboardingConnectHardwareWalletPage.subTitle.waitForDisplayed();
    expect(await OnboardingConnectHardwareWalletPage.subTitle.getText()).to.equal(
      await t('core.walletSetupConnectHardwareWalletStep.subTitle')
    );
  }

  async assertSeeSupportedDevicesText() {
    await OnboardingConnectHardwareWalletPage.supportedDevices.waitForDisplayed();
    expect(await OnboardingConnectHardwareWalletPage.supportedDevices.getText()).to.equal(
      await t('core.walletSetupConnectHardwareWalletStep.supportedDevices')
    );
  }

  async assertSeeLedgerButtonDisplayed() {
    await OnboardingConnectHardwareWalletPage.ledgerButton.waitForDisplayed();
  }

  async assertSeeConnectDeviceText() {
    await OnboardingConnectHardwareWalletPage.connectDevice.waitForDisplayed();
    expect(await OnboardingConnectHardwareWalletPage.connectDevice.getText()).to.equal(
      await t('core.walletSetupConnectHardwareWalletStep.connectDevice')
    );
  }

  async assertSeeConnectHardwareWalletPage() {
    await this.assertSeeStepTitle(await t('core.walletSetupConnectHardwareWalletStep.title'));
    await this.assertSeeConnectHardwareWalletPageSubTitle();
    await this.assertSeeSupportedDevicesText();
    await this.assertSeeLedgerButtonDisplayed();
    await this.assertSeeConnectDeviceText();

    await this.assertSeeBackButton();
    await this.assertSeeNextButton();

    await this.assertSeeLegalLinks();
    await this.assertSeeHelpAndSupportButton();
  }
}

export default new OnboardingConnectHardwareWalletPageAssert();
