import { WebElement, WebElementFactory as Factory } from '../webElement';

export class StakingSuccessDrawer extends WebElement {
  private CONTAINER = '[data-testid="result-message-content"] ';
  private ICON = '[data-testid="result-message-img"]';
  private TITLE = '[data-testid="result-message-title"]';
  private SUBTITLE = '[data-testid="result-message-description"]';
  private BUTTON = "[data-testid='drawer-footer'] button";

  constructor() {
    super();
  }

  container(): WebElement {
    // eslint-disable-next-line sonarjs/no-duplicate-string
    return Factory.fromSelector(`${this.CONTAINER}{`, 'css selector');
  }

  icon(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.ICON}`, 'css selector');
  }

  title(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TITLE}`, 'css selector');
  }

  subtitle(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.SUBTITLE}`, 'css selector');
  }

  button(): WebElement {
    return Factory.fromSelector(`${this.BUTTON}`, 'css selector');
  }
}
