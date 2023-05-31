class CollateralSettingsDrawer {
  private COLLATERAL_HEADER = '[data-testid="drawer-header-title"]';
  private COLLATERAL_DESCRIPTION = '[data-testid="collateral-description"]';
  private COLLATERAL_BANNER_DESCRIPTION = '[data-testid="banner-description"]';
  private PASSWORD_INPUT = '[data-testid="password-input"]';
  private PASSWORD_INPUT_CONTAINER = '[data-testid="password-input-container"]';
  private TRANSACTION_FEE_LABEL = '[data-testid="sp-confirmation-staking-fee-label"]';
  private TRANSACTION_FEE_AMOUNT = '[data-testid="asset-info-amount"]';
  private TRANSACTION_FEE_AMOUNT_FIAT = '[data-testid="asset-info-amount-fiat"]';
  private COLLATERAL_BUTTON = '[data-testid="collateral-confirmation-btn"]';
  private SAD_FACE_ICON = '[data-testid="collateral-sad-face-icon"]';
  private ERROR_LABEL = '[data-testid="collateral-not-enough-ada-error"]';

  get collateralHeader() {
    return $(this.COLLATERAL_HEADER);
  }
  get sadFaceIcon() {
    return $(this.SAD_FACE_ICON);
  }
  get error() {
    return $(this.ERROR_LABEL);
  }

  get collateralDescription() {
    return $(this.COLLATERAL_DESCRIPTION);
  }

  get collateralBannerDescription() {
    return $(this.COLLATERAL_BANNER_DESCRIPTION);
  }
  get passwordInput() {
    return $(this.PASSWORD_INPUT);
  }
  get passwordInputContainer() {
    return $(this.PASSWORD_INPUT_CONTAINER);
  }
  get transactionFeeLabel() {
    return $(this.TRANSACTION_FEE_LABEL);
  }
  get transactionFeeAmount() {
    return $(this.TRANSACTION_FEE_AMOUNT);
  }
  get transactionFeeFiat() {
    return $(this.TRANSACTION_FEE_AMOUNT_FIAT);
  }
  get collateralButton() {
    return $(this.COLLATERAL_BUTTON);
  }
}

export default new CollateralSettingsDrawer();
