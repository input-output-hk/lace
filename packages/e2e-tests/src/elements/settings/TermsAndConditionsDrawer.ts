import CommonDrawerElements from '../CommonDrawerElements';
import { ChainablePromiseArray, ElementArray } from 'webdriverio';

class TermsAndConditionsDrawer extends CommonDrawerElements {
  private TERMS_AND_CONDITIONS_CONTENT = '[data-testid="terms-and-conditions-content"]';

  get termsAndConditionsContent() {
    return $(this.TERMS_AND_CONDITIONS_CONTENT);
  }

  get paragraphs(): ChainablePromiseArray<ElementArray> {
    return $(this.TERMS_AND_CONDITIONS_CONTENT).$$('p');
  }
}

export default new TermsAndConditionsDrawer();
