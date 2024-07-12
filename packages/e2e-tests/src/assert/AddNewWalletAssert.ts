import AddNewWalletMainModal from '../elements/addNewWallet/MainModal';
import OnboardingMainPageAssert from './onboarding/onboardingMainPageAssert';
import OnboardingWalletSetupPageAssert from './onboarding/onboardingWalletSetupPageAssert';
import { t } from '../utils/translationService';
import { isPopupMode } from '../utils/pageUtils';
import { expect } from 'chai';
import ConnectYourDevicePage from '../elements/onboarding/ConnectYourDevicePage';
import ConnectYourDevicePageAssert from './onboarding/ConnectYourDevicePageAssert';

class AddNewWalletAssert {
  async assertMainModalIsDisplayedInExtendedMode() {
    expect(await isPopupMode()).to.be.false;
    await AddNewWalletMainModal.container.waitForDisplayed({ timeout: 5000 });
    await AddNewWalletMainModal.closeButton.waitForEnabled();
    await OnboardingMainPageAssert.assertSeeLogo();
    await OnboardingMainPageAssert.assertSeeTitle();
    await OnboardingMainPageAssert.assertSeeSubtitle();
    await OnboardingMainPageAssert.assertSeeCreateWalletOption();
    await OnboardingMainPageAssert.assertSeeHardwareWalletOption();
    await OnboardingMainPageAssert.assertSeeRestoreWalletOption();
  }

  async assertSeeWalletSetupPageInModal() {
    await AddNewWalletMainModal.container.waitForDisplayed({ timeout: 5000 });
    await AddNewWalletMainModal.closeButton.waitForEnabled();
    await OnboardingWalletSetupPageAssert.assertSeeStepTitle(await t('core.walletNameAndPasswordSetupStep.title'));
    await OnboardingWalletSetupPageAssert.assertSeeStepSubtitle(
      await t('core.walletNameAndPasswordSetupStep.description')
    );
    await OnboardingWalletSetupPageAssert.assertSeeWalletNameInput();
    await OnboardingWalletSetupPageAssert.assertSeePasswordInput();
    await OnboardingWalletSetupPageAssert.assertSeeBackButton();
    await OnboardingWalletSetupPageAssert.assertSeeEnterWalletButton();
  }

  async asserSeeConnectYourDevicePageInModal() {
    await AddNewWalletMainModal.container.waitForDisplayed({ timeout: 5000 });
    await AddNewWalletMainModal.closeButton.waitForEnabled();
    await ConnectYourDevicePageAssert.assertSeeStepTitle(
      await t('core.walletSetupConnectHardwareWalletStepRevamp.title')
    );
    await ConnectYourDevicePageAssert.assertSeeStepSubtitle(
      await t('core.walletSetupConnectHardwareWalletStepRevamp.subTitle')
    );
    await ConnectYourDevicePage.loader.waitForDisplayed();

    await ConnectYourDevicePageAssert.assertSeeBackButton();
    await ConnectYourDevicePageAssert.assertSeeTryAgainButton(false);
  }
}

export default new AddNewWalletAssert();
