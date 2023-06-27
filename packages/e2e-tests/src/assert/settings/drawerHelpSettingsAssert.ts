import HelpSettingsDrawer from '../../elements/settings/extendedView/helpSettingsDrawer';
import { t } from '../../utils/translationService';
import { expect } from 'chai';

class DrawerHelpSettingsAssert {
  async assertSeeCreateASupportTicketButton(shouldBeDisplayed: boolean) {
    await HelpSettingsDrawer.createASupportTicketButton.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      await expect(await HelpSettingsDrawer.createASupportTicketButton.getText()).to.equal(
        await t('browserView.settings.help.support.createASupportTicket')
      );
    }
  }

  async assertSeeHelpDrawer(mode: 'extended' | 'popup') {
    await HelpSettingsDrawer.drawerHeaderTitle.waitForDisplayed();
    await expect(await HelpSettingsDrawer.drawerHeaderTitle.getText()).to.equal(
      await t('browserView.settings.help.support.help')
    );
    await HelpSettingsDrawer.helpDescriptionContent.waitForDisplayed();
    await expect(await HelpSettingsDrawer.helpDescriptionContent.getText()).to.equal(
      await t('browserView.settings.help.support.description')
    );
    await HelpSettingsDrawer.helpZendeskTitle.waitForDisplayed();
    await expect(await HelpSettingsDrawer.helpZendeskTitle.getText()).to.equal(
      await t('browserView.settings.help.support.iogZenDesk')
    );
    await this.assertSeeCreateASupportTicketButton(true);

    const isExtended = mode === 'extended';
    await HelpSettingsDrawer.drawerNavigationTitle.waitForDisplayed({ reverse: !isExtended });
    await HelpSettingsDrawer.drawerHeaderCloseButton.waitForDisplayed({ reverse: !isExtended });
    await HelpSettingsDrawer.drawerHeaderBackButton.waitForDisplayed({ reverse: isExtended });
    if (isExtended) {
      await expect(await HelpSettingsDrawer.drawerNavigationTitle.getText()).to.equal(
        await t('browserView.settings.heading')
      );
    }
  }
}

export default new DrawerHelpSettingsAssert();
