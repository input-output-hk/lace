/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import { OnboardingMainPage } from '../onboarding/mainPage';

class AddNewWalletMainModal extends OnboardingMainPage {
  private MODAL = '.ant-modal-content';
  private CLOSE_BUTTON = '[data-testid="navigation-button-cross"]';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MODAL);
  }

  get closeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CLOSE_BUTTON);
  }
}

export default new AddNewWalletMainModal();
