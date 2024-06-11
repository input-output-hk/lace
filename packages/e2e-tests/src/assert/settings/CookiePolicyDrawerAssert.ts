import CookiePolicyDrawer from '../../elements/settings/CookiePolicyDrawer';
import { expect } from 'chai';
import { readFromFile } from '../../utils/fileUtils';
import { t } from '../../utils/translationService';
import { browser } from '@wdio/globals';
import { removeWhitespacesFromText } from '../../utils/textUtils';

class CookiePolicyDrawerAssert {
  assertSeeDrawerNavigationTitle = async () => {
    await CookiePolicyDrawer.drawerNavigationTitle.waitForDisplayed();
    expect(await CookiePolicyDrawer.drawerNavigationTitle.getText()).to.equal(await t('browserView.settings.heading'));
  };

  assertSeeDrawerCloseButton = async () => {
    await CookiePolicyDrawer.drawerHeaderCloseButton.waitForClickable();
  };

  assertSeeDrawerBackButton = async () => {
    await CookiePolicyDrawer.drawerHeaderBackButton.waitForClickable();
  };

  assertSeeCookiePolicyTitle = async () => {
    await CookiePolicyDrawer.drawerHeaderTitle.waitForDisplayed();
    expect(await CookiePolicyDrawer.drawerHeaderTitle.getText()).to.equal(
      await t('browserView.settings.legal.cookiePolicy.title')
    );
  };

  assertSeeCookiePolicyContent = async () => {
    await CookiePolicyDrawer.cookiePolicyContent.waitForDisplayed();

    const expectedCookiePolicyText = await removeWhitespacesFromText(
      readFromFile(import.meta.dirname, './cookiePolicy.txt')
    );

    await browser.waitUntil(
      async () =>
        (await removeWhitespacesFromText(await CookiePolicyDrawer.cookiePolicyContent.getText())) ===
        expectedCookiePolicyText,
      {
        timeout: 3000,
        interval: 1000,
        timeoutMsg: `failed while waiting for expected cookie policy text
        expected: ${expectedCookiePolicyText}
        current: ${await removeWhitespacesFromText(await CookiePolicyDrawer.cookiePolicyContent.getText())}
        `
      }
    );
  };
}

export default new CookiePolicyDrawerAssert();
