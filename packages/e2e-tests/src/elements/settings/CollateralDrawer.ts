/* global WebdriverIO */
import CommonDrawerElements from '../CommonDrawerElements';
import type { ChainablePromiseElement } from 'webdriverio';

class CollateralDrawer extends CommonDrawerElements {
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

  get sadFaceIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SAD_FACE_ICON);
  }
  get error(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ERROR_LABEL);
  }

  get collateralDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COLLATERAL_DESCRIPTION);
  }

  get collateralBannerDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COLLATERAL_BANNER_DESCRIPTION);
  }
  get passwordInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PASSWORD_INPUT);
  }
  get passwordInputContainer(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PASSWORD_INPUT_CONTAINER);
  }
  get transactionFeeLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_FEE_LABEL);
  }
  get transactionFeeAmount(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_FEE_AMOUNT);
  }
  get transactionFeeFiat(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_FEE_AMOUNT_FIAT);
  }
  get collateralButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COLLATERAL_BUTTON);
  }
}

export default new CollateralDrawer();
