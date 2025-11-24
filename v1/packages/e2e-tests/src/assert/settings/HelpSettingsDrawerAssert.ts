import HelpDrawer from '../../elements/settings/HelpDrawer';
import { t } from '../../utils/translationService';
import { expect } from 'chai';

class HelpSettingsDrawerAssert {
  async assertSeeCreateASupportTicketButton(shouldBeDisplayed: boolean) {
    await HelpDrawer.createASupportTicketButton.waitForClickable({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      expect(await HelpDrawer.createASupportTicketButton.getText()).to.equal(
        await t('browserView.settings.help.support.createASupportTicket')
      );
    }
  }

  async assertSeeHelpDrawer(mode: 'extended' | 'popup') {
    await HelpDrawer.drawerHeaderTitle.waitForClickable();
    expect(await HelpDrawer.drawerHeaderTitle.getText()).to.equal(await t('browserView.settings.help.support.help'));
    await HelpDrawer.helpDescriptionContent.waitForDisplayed();
    expect(await HelpDrawer.helpDescriptionContent.getText()).to.equal(
      await t('browserView.settings.help.support.description')
    );
    await HelpDrawer.helpZendeskTitle.waitForDisplayed();
    expect(await HelpDrawer.helpZendeskTitle.getText()).to.equal(
      await t('browserView.settings.help.support.iogZenDesk')
    );
    await this.assertSeeCreateASupportTicketButton(true);

    const isExtended = mode === 'extended';
    await HelpDrawer.drawerNavigationTitle.waitForDisplayed({ reverse: !isExtended });
    await HelpDrawer.drawerHeaderCloseButton.waitForDisplayed({ reverse: !isExtended });
    await HelpDrawer.drawerHeaderBackButton.waitForDisplayed({ reverse: isExtended });
    if (isExtended) {
      expect(await HelpDrawer.drawerNavigationTitle.getText()).to.equal(await t('browserView.settings.heading'));
    }
  }
}

export default new HelpSettingsDrawerAssert();
