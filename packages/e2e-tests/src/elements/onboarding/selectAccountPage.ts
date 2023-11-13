import CommonOnboardingElements from './commonOnboardingElements';

class SelectAccountPage extends CommonOnboardingElements {
  private ACCOUNT_RADIO_BUTTONS = '.ant-radio-input';

  get accountRadioButtons() {
    return $$(this.ACCOUNT_RADIO_BUTTONS);
  }
}
export default new SelectAccountPage();
