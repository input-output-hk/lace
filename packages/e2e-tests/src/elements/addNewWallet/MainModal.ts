/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import { OnboardingMainPage } from '../onboarding/mainPage';

class AddNewWalletMainModal extends OnboardingMainPage {
  private MODAL = '.ant-modal-content';
  private CLOSE_BUTTON = '[data-testid="navigation-button-cross"]';
  private AREA_OUTSIDE_MODAL = '.ant-modal-mask';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MODAL);
  }

  get closeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CLOSE_BUTTON);
  }

  get areaOutsideModal(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.AREA_OUTSIDE_MODAL);
  }
}

export default new AddNewWalletMainModal();
