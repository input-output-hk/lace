import PrivacyPolicyDrawer from '../../elements/settings/PrivacyPolicyDrawer';
import { t } from '../../utils/translationService';
import { expect } from 'chai';
import { readFromFile } from '../../utils/fileUtils';
import { removeWhitespacesFromText } from '../../utils/textUtils';
import { browser } from '@wdio/globals';

class PrivacyPolicyDrawerAssert {
  assertSeeDrawerNavigationTitle = async () => {
    await PrivacyPolicyDrawer.drawerNavigationTitle.waitForDisplayed();
    expect(await PrivacyPolicyDrawer.drawerNavigationTitle.getText()).to.equal(await t('browserView.settings.heading'));
  };

  assertSeeDrawerCloseButton = async () => {
    await PrivacyPolicyDrawer.drawerHeaderCloseButton.waitForClickable();
  };

  assertSeeDrawerBackButton = async () => {
    await PrivacyPolicyDrawer.drawerHeaderBackButton.waitForClickable();
  };

  async assertSeePrivacyPolicyTitle() {
    await PrivacyPolicyDrawer.drawerHeaderTitle.waitForDisplayed();
    expect(await PrivacyPolicyDrawer.drawerHeaderTitle.getText()).to.equal(
      await t('browserView.settings.legal.privacyPolicy.title')
    );
  }

  async assertSeePrivacyPolicyContent() {
    const expectedPolicy = await removeWhitespacesFromText(
      readFromFile(import.meta.dirname, '../settings/privacyPolicy.txt')
    );
    await PrivacyPolicyDrawer.privacyPolicyContent.waitForDisplayed();

    await browser.waitUntil(
      async () =>
        (await removeWhitespacesFromText(await PrivacyPolicyDrawer.privacyPolicyContent.getText())) === expectedPolicy,
      {
        timeout: 3000,
        interval: 1000,
        timeoutMsg: `failed while waiting for expected privacy policy text
        expected: ${expectedPolicy}
        current: ${await removeWhitespacesFromText(await PrivacyPolicyDrawer.privacyPolicyContent.getText())}
        `
      }
    );
  }
}

export default new PrivacyPolicyDrawerAssert();
