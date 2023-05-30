import webTester from '../../actor/webTester';
import { HelpSettingsDrawer } from '../../elements/settings/extendedView/helpSettingsDrawer';
import { t } from '../../utils/translationService';

export default new (class DrawerHelpSettingsAssert {
  async assertSeeCreateNewTicketKeyButton() {
    const helpDrawer = new HelpSettingsDrawer();
    await webTester.seeWebElement(helpDrawer.createNewTicketButton());
  }

  async assertSeeHelpModal() {
    const helpDrawer = new HelpSettingsDrawer();
    await webTester.seeWebElement(helpDrawer.helpDescriptionContent());
    await webTester.seeTextInElement(
      helpDrawer.helpDescriptionContent(),
      await t('browserView.settings.help.support.description')
    );
    await webTester.seeWebElement(helpDrawer.helpZendeskTitle());
    await webTester.seeTextInElement(
      helpDrawer.helpZendeskTitle(),
      await t('browserView.settings.help.support.iogZenDesk')
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async assertSeeHelpRequestTicketPage() {}
})();
