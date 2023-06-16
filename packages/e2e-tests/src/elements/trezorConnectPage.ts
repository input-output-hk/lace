class TrezorConnectPage {
  private CONFIRM_BUTTON = '.confirm';
  get confirmButton() {
    return $(this.CONFIRM_BUTTON);
  }
}
export default new TrezorConnectPage();
