/* global WebdriverIO */
import CommonDrawerElements from '../CommonDrawerElements';
import type { ChainablePromiseElement } from 'webdriverio';

class CollateralDrawer extends CommonDrawerElements {
  private COLLATERAL_DESCRIPTION = '[data-testid="collateral-description"]';
  private COLLATERAL_BANNER_DESCRIPTION = '[data-testid="banner-description"]';
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

  get collateralButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COLLATERAL_BUTTON);
  }
}

export default new CollateralDrawer();
