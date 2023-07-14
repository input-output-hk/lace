import CookiePolicyDrawer from '../../elements/settings/CookiePolicyDrawer';
import { expect } from 'chai';
import { readFromFile } from '../../utils/fileUtils';
import { t } from '../../utils/translationService';
import { browser } from '@wdio/globals';

class CookiePolicyDrawerAssert {
  assertSeeDrawerNavigationTitle = async () => {
    await CookiePolicyDrawer.drawerNavigationTitle.waitForDisplayed();
    await expect(await CookiePolicyDrawer.drawerNavigationTitle.getText()).to.equal(
      await t('browserView.settings.heading')
    );
  };

  assertSeeDrawerCloseButton = async () => {
    await CookiePolicyDrawer.drawerHeaderCloseButton.waitForClickable();
  };

  assertSeeDrawerBackButton = async () => {
    await CookiePolicyDrawer.drawerHeaderBackButton.waitForClickable();
  };

  assertSeeCookiePolicyTitle = async () => {
    await CookiePolicyDrawer.drawerHeaderTitle.waitForDisplayed();
    await expect(await CookiePolicyDrawer.drawerHeaderTitle.getText()).to.equal(
      await t('browserView.settings.legal.cookiePolicy.title')
    );
  };

  assertSeeCookiePolicyContent = async () => {
    await CookiePolicyDrawer.cookiePolicyContent.waitForDisplayed();

    const expectedCookiePolicyText = readFromFile(__dirname, './cookiePolicy.txt');

    await browser.waitUntil(
      async () => (await CookiePolicyDrawer.cookiePolicyContent.getText()) === expectedCookiePolicyText,
      {
        timeout: 3000,
        interval: 1000,
        timeoutMsg: `failed while waiting for expected cookie policy text
        expected: ${expectedCookiePolicyText}
        current: ${await CookiePolicyDrawer.cookiePolicyContent.getText()}
        `
      }
    );
  };
}

export default new CookiePolicyDrawerAssert();
