class TrezorConnectPage {
  private CONFIRM_BUTTON = '[data-test="@permissions/confirm-button"]';
  private EXPORT_BUTTON = "[id='container'] .confirm";
  private ANALYTICS_CONFIRM_BUTTON = '[data-test="@analytics/continue-button"]';
  private ANALYTICS_TOGGLE_BUTTON = '[data-test="@analytics/toggle-switch"]';
  private SHADOW_ROOT = '#react';

  get confirmButton() {
    return $(this.CONFIRM_BUTTON);
  }
  get analyticsConfirmButton() {
    return $(this.SHADOW_ROOT).shadow$(this.ANALYTICS_CONFIRM_BUTTON);
  }
  get analyticsToggleButton() {
    return $(this.SHADOW_ROOT).shadow$(this.ANALYTICS_TOGGLE_BUTTON);
  }
  get exportButton() {
    return $(this.EXPORT_BUTTON);
  }
}
export default new TrezorConnectPage();
