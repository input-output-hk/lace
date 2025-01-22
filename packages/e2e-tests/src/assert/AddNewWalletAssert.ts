import AddNewWalletMainModal from '../elements/addNewWallet/MainModal';
import OnboardingMainPageAssert from './onboarding/onboardingMainPageAssert';
import OnboardingWalletSetupPageAssert from './onboarding/onboardingWalletSetupPageAssert';
import { t } from '../utils/translationService';
import { isPopupMode } from '../utils/pageUtils';
import { expect } from 'chai';
import ConnectYourDevicePage from '../elements/onboarding/ConnectYourDevicePage';
import ConnectYourDevicePageAssert from './onboarding/ConnectYourDevicePageAssert';
import CancelAddingNewWalletDialog from '../elements/addNewWallet/CancelAddingNewWalletDialog';

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

  async assertMainModalIsNotDisplayed() {
    await AddNewWalletMainModal.container.waitForDisplayed({ reverse: true });
  }

  async assertSeeWalletSetupPageInModal(flow: 'Create' | 'Create paper wallet' | 'Restore') {
    await AddNewWalletMainModal.container.waitForDisplayed({ timeout: 5000 });
    await AddNewWalletMainModal.closeButton.waitForEnabled();
    await OnboardingWalletSetupPageAssert.assertSeeStepTitle(await t('core.walletNameAndPasswordSetupStep.title'));
    await OnboardingWalletSetupPageAssert.assertSeeStepSubtitle(
      await t('core.walletNameAndPasswordSetupStep.description')
    );
    await OnboardingWalletSetupPageAssert.assertSeeWalletNameInput();
    await OnboardingWalletSetupPageAssert.assertSeePasswordInput();
    await OnboardingWalletSetupPageAssert.assertSeeBackButton();
    await OnboardingWalletSetupPageAssert.assertSeeEnterWalletButton(flow === 'Create paper wallet');
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

  async assertSeeStartOverDialog(shouldSee: boolean) {
    await CancelAddingNewWalletDialog.body.waitForDisplayed({ reverse: !shouldSee });
    if (shouldSee) {
      await CancelAddingNewWalletDialog.title.waitForDisplayed();
      expect(await CancelAddingNewWalletDialog.title.getText()).to.equal(
        await t('core.multiWallet.confirmationDialog.title')
      );
      await CancelAddingNewWalletDialog.description.waitForDisplayed();
      expect(await CancelAddingNewWalletDialog.description.getText()).to.equal(
        await t('core.multiWallet.confirmationDialog.description')
      );
      await CancelAddingNewWalletDialog.goBackButton.waitForDisplayed();
      expect(await CancelAddingNewWalletDialog.goBackButton.getText()).to.equal(
        await t('core.multiWallet.confirmationDialog.cancel')
      );
      await CancelAddingNewWalletDialog.proceedButton.waitForDisplayed();
      expect(await CancelAddingNewWalletDialog.proceedButton.getText()).to.equal(
        await t('core.multiWallet.confirmationDialog.confirm')
      );
    }
  }
}

export default new AddNewWalletAssert();
