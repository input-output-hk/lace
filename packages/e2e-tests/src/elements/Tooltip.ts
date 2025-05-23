/* global WebdriverIO */
import type { ChainablePromiseElement } from 'webdriverio';

class Tooltip {
  private TOOLTIP_COMPONENT = '[data-testid="tooltip"]';
  private TOOLTIP_LABEL = '[data-testid="tooltip-label"]';
  private TOOLTIP_VALUE = '[data-testid="tooltip-value"]';

  get component(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TOOLTIP_COMPONENT);
  }

  get label(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TOOLTIP_LABEL);
  }

  get value(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TOOLTIP_VALUE);
  }
}

export default new Tooltip();
