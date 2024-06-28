import MainModal from '../elements/addNewWallet/MainModal';
import onboardingMainPageAssert from './onboarding/onboardingMainPageAssert';
import { isPopupMode } from '../utils/pageUtils';
import { expect } from 'chai';

class AddNewWalletAssert {
  async assertMainModalIsDisplayedInExtendedMode() {
    expect(await isPopupMode()).to.be.false;
    await MainModal.modal.waitForDisplayed({ timeout: 5000 });
    await MainModal.closeButton.waitForEnabled();
    await onboardingMainPageAssert.assertSeeLogo();
    await onboardingMainPageAssert.assertSeeTitle();
    await onboardingMainPageAssert.assertSeeSubtitle();
    await onboardingMainPageAssert.assertSeeCreateWalletOption();
    await onboardingMainPageAssert.assertSeeHardwareWalletOption();
    await onboardingMainPageAssert.assertSeeRestoreWalletOption();
  }
}

export default new AddNewWalletAssert();
