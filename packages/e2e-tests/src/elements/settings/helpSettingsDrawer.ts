import CommonDrawerElements from '../CommonDrawerElements';

class HelpSettingsDrawer extends CommonDrawerElements {
  private HELP_CREATE_A_SUPPORT_TICKET_BUTTON = '[data-testid="create-new-ticket-button"]';
  private HELP_DESCRIPTION = '[data-testid="help-description"]';
  private HELP_ZENDESK_TITLE = '[data-testid="help-zen-title"]';

  get createASupportTicketButton() {
    return $(this.HELP_CREATE_A_SUPPORT_TICKET_BUTTON);
  }

  get helpDescriptionContent() {
    return $(this.HELP_DESCRIPTION);
  }

  get helpZendeskTitle() {
    return $(this.HELP_ZENDESK_TITLE);
  }
}

export default new HelpSettingsDrawer();
