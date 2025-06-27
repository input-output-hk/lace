/* global WebdriverIO */
import CommonDrawerElements from '../CommonDrawerElements';
import type { ChainablePromiseElement } from 'webdriverio';

class HelpDrawer extends CommonDrawerElements {
  private HELP_CREATE_A_SUPPORT_TICKET_BUTTON = '[data-testid="create-new-ticket-button"]';
  private HELP_DESCRIPTION = '[data-testid="help-description"]';
  private HELP_ZENDESK_TITLE = '[data-testid="help-zen-title"]';

  get createASupportTicketButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.HELP_CREATE_A_SUPPORT_TICKET_BUTTON);
  }

  get helpDescriptionContent(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.HELP_DESCRIPTION);
  }

  get helpZendeskTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.HELP_ZENDESK_TITLE);
  }
}

export default new HelpDrawer();
