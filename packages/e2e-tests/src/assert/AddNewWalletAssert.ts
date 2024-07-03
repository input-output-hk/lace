import AddNewWalletMainModal from '../elements/addNewWallet/MainModal';
import onboardingMainPageAssert from './onboarding/onboardingMainPageAssert';
import onboardingWalletSetupPageAssert from './onboarding/onboardingWalletSetupPageAssert';
import { t } from '../utils/translationService';
import { isPopupMode } from '../utils/pageUtils';
import { expect } from 'chai';

class AddNewWalletAssert {
  async assertMainModalIsDisplayedInExtendedMode() {
    expect(await isPopupMode()).to.be.false;
    await AddNewWalletMainModal.container.waitForDisplayed({ timeout: 5000 });
    await AddNewWalletMainModal.closeButton.waitForEnabled();
    await onboardingMainPageAssert.assertSeeLogo();
    await onboardingMainPageAssert.assertSeeTitle();
    await onboardingMainPageAssert.assertSeeSubtitle();
    await onboardingMainPageAssert.assertSeeCreateWalletOption();
    await onboardingMainPageAssert.assertSeeHardwareWalletOption();
    await onboardingMainPageAssert.assertSeeRestoreWalletOption();
  }

  async assertSeeWalletSetupPageInModal() {
    await AddNewWalletMainModal.container.waitForDisplayed({ timeout: 5000 });
    await AddNewWalletMainModal.closeButton.waitForEnabled();
    await onboardingWalletSetupPageAssert.assertSeeStepTitle(await t('core.walletNameAndPasswordSetupStep.title'));
    await onboardingWalletSetupPageAssert.assertSeeStepSubtitle(
      await t('core.walletNameAndPasswordSetupStep.description')
    );
    await onboardingWalletSetupPageAssert.assertSeeWalletNameInput();
    await onboardingWalletSetupPageAssert.assertSeePasswordInput();
    await onboardingWalletSetupPageAssert.assertSeeBackButton();
    await onboardingWalletSetupPageAssert.assertSeeEnterWalletButton();
  }
}

export default new AddNewWalletAssert();
