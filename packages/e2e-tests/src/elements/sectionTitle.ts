/* global WebdriverIO */
import type { ChainablePromiseElement } from 'webdriverio';

class SectionTitle {
  private SECTION_TITLE = '[data-testid="section-title"]';
  private SECTION_COUNTER = '[data-testid="section-title-counter"]';

  get sectionTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SECTION_TITLE);
  }

  get sectionCounter(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SECTION_COUNTER);
  }

  async getCounterAsNumber(): Promise<number> {
    return Number((await this.sectionCounter.getText()).slice(1, -1));
  }
}

export default new SectionTitle();
