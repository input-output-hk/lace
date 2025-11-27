/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import CommonDrawerElements from '../CommonDrawerElements';
import { setInputFieldValue } from '../../utils/inputFieldUtils';
import { isPopupMode } from '../../utils/pageUtils';

class CustomSubmitApiDrawer extends CommonDrawerElements {
  private DESCRIPTION = '[data-testid="custom-submit-api-description"]';
  private LEARN_MORE_LINK = '[data-testid="custom-submit-api-learn-more-url"]';
  private DEFAULT_ADDRESS = '[data-testid="custom-submit-api-default-address"]';
  private URL_INPUT = '[data-testid="custom-submit-api-url-input"]';
  private URL_INPUT_LABEL = '[data-testid="custom-submit-api-url-label"]';
  private ENABLE_BUTTON = '[data-testid="custom-submit-button-enable"]';
  private DISABLE_BUTTON = '[data-testid="custom-submit-button-disable"]';
  private VALIDATION_ERROR = '[data-testid="custom-submit-api-validation-error"]';

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DESCRIPTION);
  }

  get learnMoreLink(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.LEARN_MORE_LINK);
  }

  get defaultAddress(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DEFAULT_ADDRESS);
  }

  get urlInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.URL_INPUT);
  }

  get urlInputLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.URL_INPUT_LABEL);
  }

  get enableButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ENABLE_BUTTON);
  }

  get disableButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DISABLE_BUTTON);
  }

  get validationError(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.VALIDATION_ERROR);
  }

  async clickLearnMoreLink(): Promise<void> {
    await this.learnMoreLink.waitForClickable();
    await this.learnMoreLink.click();
  }

  async enterUrl(url: string): Promise<void> {
    await this.urlInput.waitForClickable();
    await setInputFieldValue(await this.urlInput, url);
  }

  async clickEnableButton(): Promise<void> {
    await this.enableButton.waitForClickable();
    await this.enableButton.click();
  }

  async clickDisableButton(): Promise<void> {
    await this.disableButton.waitForClickable();
    await this.disableButton.click();
  }

  async closeDrawer(): Promise<void> {
    (await isPopupMode()) ? await this.clickBackDrawerButton() : await this.clickCloseDrawerButton();
  }
}

export default new CustomSubmitApiDrawer();
