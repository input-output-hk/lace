import PrivacyPolicyDrawer from '../../elements/settings/PrivacyPolicyDrawer';
import { t } from '../../utils/translationService';
import { expect } from 'chai';
import { readFromFile } from '../../utils/fileUtils';
import { removeWhitespacesFromText } from '../../utils/textUtils';

class PrivacyPolicyDrawerAssert {
  assertSeeDrawerNavigationTitle = async () => {
    await PrivacyPolicyDrawer.drawerNavigationTitle.waitForDisplayed();
    await expect(await PrivacyPolicyDrawer.drawerNavigationTitle.getText()).to.equal(
      await t('browserView.settings.heading')
    );
  };

  assertSeeDrawerCloseButton = async () => {
    await PrivacyPolicyDrawer.drawerHeaderCloseButton.waitForClickable();
  };

  assertSeeDrawerBackButton = async () => {
    await PrivacyPolicyDrawer.drawerHeaderBackButton.waitForClickable();
  };

  async assertSeePrivacyPolicyTitle() {
    await PrivacyPolicyDrawer.drawerHeaderTitle.waitForDisplayed();
    await expect(await PrivacyPolicyDrawer.drawerHeaderTitle.getText()).to.equal(
      await t('browserView.settings.legal.privacyPolicy.title')
    );
  }

  async assertSeePrivacyPolicyContent() {
    const expectedPolicy = readFromFile(__dirname, '../settings/privacyPolicy.txt');
    await PrivacyPolicyDrawer.privacyPolicyContent.waitForDisplayed();
    const currentPolicy = await PrivacyPolicyDrawer.privacyPolicyContent.getText();
    await expect(await removeWhitespacesFromText(currentPolicy)).to.equal(
      await removeWhitespacesFromText(expectedPolicy)
    );
  }
}

export default new PrivacyPolicyDrawerAssert();
