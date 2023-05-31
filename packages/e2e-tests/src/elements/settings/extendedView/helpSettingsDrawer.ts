import { DrawerCommonExtended } from '../../drawerCommonExtended';
import { WebElement, WebElementFactory as Factory } from '../../webElement';

export class HelpSettingsDrawer extends WebElement {
  baseDrawer: DrawerCommonExtended;
  private HELP_CREATE_NEW_TICKET_BUTTON = '//button[@data-testid="create-new-ticket-button"]';
  private HELP_DESCRIPTION = '//*[@data-testid="help-description"]';
  private HELP_ZENDESK_TITLE = '//*[@data-testid="help-zen-title"]';
  constructor() {
    super();
    this.baseDrawer = new DrawerCommonExtended();
  }
  createNewTicketButton(): WebElement {
    return Factory.fromSelector(
      `${this.baseDrawer.container().toJSLocator()}${this.HELP_CREATE_NEW_TICKET_BUTTON}`,
      'xpath'
    );
  }
  helpDescriptionContent(): WebElement {
    return Factory.fromSelector(`${this.baseDrawer.container().toJSLocator()}${this.HELP_DESCRIPTION}`, 'xpath');
  }
  helpZendeskTitle(): WebElement {
    return Factory.fromSelector(`${this.baseDrawer.container().toJSLocator()}${this.HELP_ZENDESK_TITLE}`, 'xpath');
  }
}
