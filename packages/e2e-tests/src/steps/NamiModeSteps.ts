import { Then, When } from '@cucumber/cucumber';
import ModalAssert from '../assert/modalAssert';
import { Logger } from '../support/logger';
import PopupView from '../page/popupView';
import MainPageAssert from '../assert/namiMode/MainPageAssert';
import LegacyModeScreenAssert from '../assert/LegacyModeScreenAssert';
import ActivateNamiModeModal from '../elements/namiMode/ActivateNamiModeModal';

Then(/^"You're about to activate Nami mode." modal (is|is not) displayed$/, async (state: 'is' | 'is not') => {
  await ModalAssert.assertSeeSwitchToNamiModeModal(state === 'is');
});

When(
  /^I click "(Back|Continue)" button on "You're about to activate Nami mode." modal$/,
  async (button: 'Back' | 'Continue') => {
    switch (button) {
      case 'Continue':
        await ActivateNamiModeModal.clickConfirmButton();
        break;
      case 'Back':
        await ActivateNamiModeModal.clickCancelButton();
        break;
      default:
        throw new Error(`Unsupported button name: ${button}`);
    }
  }
);

// eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars
Then(/^Nami mode popup (is|is not) displayed \(MANUAL STEP\)$/, async (_state: 'is' | 'is not') => {
  Logger.log('Unable to verify Nami mode popup with WebdriverIO, please check manually');
});

When(/^I go to Nami mode$/, async () => {
  await PopupView.visitNamiMode();
});

Then(/^Nami mode is enabled$/, async () => {
  await MainPageAssert.assertSeeNamiModeContainer();
});

Then(/^"Legacy mode enabled" screen is displayed$/, async () => {
  await LegacyModeScreenAssert.assertSeeLegacyModeScreen();
});
