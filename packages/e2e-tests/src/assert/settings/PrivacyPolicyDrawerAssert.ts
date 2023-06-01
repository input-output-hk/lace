import PrivacyPolicySettingsDrawer from '../../elements/settings/extendedView/privacyPolicySettingsDrawer';
import { t } from '../../utils/translationService';
import { expect } from 'chai';
import { readFromFile } from '../../utils/fileUtils';
import { removeWhitespacesFromText } from '../../utils/textUtils';

class PrivacyPolicyDrawerAssert {
  assertSeeDrawerNavigationTitle = async () => {
    await PrivacyPolicySettingsDrawer.drawerNavigationTitle.waitForDisplayed();
    await expect(await PrivacyPolicySettingsDrawer.drawerNavigationTitle.getText()).to.equal(
      await t('browserView.settings.heading')
    );
  };

  assertSeeDrawerCloseButton = async () => {
    await PrivacyPolicySettingsDrawer.closeButton.waitForDisplayed();
  };

  assertSeeDrawerBackButton = async () => {
    await PrivacyPolicySettingsDrawer.backButton.waitForDisplayed();
  };

  async assertSeePrivacyPolicyTitle() {
    await PrivacyPolicySettingsDrawer.drawerHeaderTitle.waitForDisplayed();
    await expect(await PrivacyPolicySettingsDrawer.drawerHeaderTitle.getText()).to.equal(
      await t('browserView.settings.legal.privacyPolicy.title')
    );
  }

  async assertSeePrivacyPolicyContent() {
    const expectedPolicy = readFromFile(__dirname, '../settings/privacyPolicy.txt');
    await PrivacyPolicySettingsDrawer.privacyPolicyContent.waitForDisplayed();
    const currentPolicy = await PrivacyPolicySettingsDrawer.privacyPolicyContent.getText();
    await expect(await removeWhitespacesFromText(currentPolicy)).to.equal(
      await removeWhitespacesFromText(expectedPolicy)
    );
  }
}

export default new PrivacyPolicyDrawerAssert();
