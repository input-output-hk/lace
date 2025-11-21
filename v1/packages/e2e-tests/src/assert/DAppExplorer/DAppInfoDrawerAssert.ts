import DAppInfoDrawer from '../../elements/DAppExplorer/DAppInfoDrawer';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class DAppInfoDrawerAssert {
  async assertSeeDAppInfoDrawer(dappName: string) {
    await DAppInfoDrawer.drawerNavigationTitle.waitForDisplayed();
    await DAppInfoDrawer.drawerHeaderCloseButton.waitForDisplayed();
    expect(await DAppInfoDrawer.drawerNavigationTitle.getText()).to.equal(
      await t('dappdiscovery.side_panel.about_this_dapp')
    );
    await DAppInfoDrawer.icon.waitForDisplayed();
    await DAppInfoDrawer.title.waitForDisplayed();
    expect(await DAppInfoDrawer.title.getText()).to.equal(dappName);
    await DAppInfoDrawer.categories.waitForDisplayed();
    // More Details tab
    await DAppInfoDrawer.moreDetailsTabButton.waitForDisplayed();
    expect(await DAppInfoDrawer.moreDetailsTabButton.getText()).to.equal(
      await t('dappdiscovery.side_panel.more_details')
    );
    await DAppInfoDrawer.summaryLabel.waitForDisplayed();
    expect(await DAppInfoDrawer.summaryLabel.getText()).to.equal(await t('dappdiscovery.side_panel.summary'));
    await DAppInfoDrawer.summaryText.waitForDisplayed();
    await DAppInfoDrawer.descriptionLabel.waitForDisplayed();
    expect(await DAppInfoDrawer.descriptionLabel.getText()).to.equal(
      await t('dappdiscovery.side_panel.dapp_description')
    );
    await DAppInfoDrawer.descriptionText.waitForDisplayed();
    // Contact tab
    await DAppInfoDrawer.contactTabButton.waitForDisplayed();
    expect(await DAppInfoDrawer.contactTabButton.getText()).to.equal(await t('dappdiscovery.side_panel.contact'));
    await DAppInfoDrawer.contactTabButton.click();
    // We may expand contact items validation with comparison of DApps data retrieved from DAppRadar API (stored in browser's Local Storage)
    const contactItems = await DAppInfoDrawer.contactItems;
    for (const contactItem of contactItems) {
      await contactItem.waitForDisplayed();
    }
    // CTA button
    await DAppInfoDrawer.dappOpenButton.waitForDisplayed();
  }
}

export default new DAppInfoDrawerAssert();
