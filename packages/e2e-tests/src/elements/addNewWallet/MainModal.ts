/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import { OnboardingMainPage } from '../onboarding/mainPage';

class MainModal extends OnboardingMainPage {
  private MODAL = '.ant-modal-content';
  private CLOSE_BUTTON = '[data-testid="navigation-button-cross"]';

  get modal(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MODAL);
  }
  get closeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CLOSE_BUTTON);
  }
}

export default new MainModal();
