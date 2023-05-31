import CookiePolicyDrawer from '../../elements/settings/extendedView/CookiePolicyDrawer';
import { expect } from 'chai';
import { readFromFile } from '../../utils/fileUtils';
import { t } from '../../utils/translationService';

class CookiePolicyDrawerAssert {
  assertSeeDrawerNavigationTitle = async () => {
    await CookiePolicyDrawer.drawerNavigationTitle.waitForDisplayed();
    await expect(await CookiePolicyDrawer.drawerNavigationTitle.getText()).to.equal(
      await t('browserView.settings.heading')
    );
  };

  assertSeeDrawerCloseButton = async () => {
    await CookiePolicyDrawer.crossButton.waitForDisplayed();
  };

  assertSeeDrawerBackButton = async () => {
    await CookiePolicyDrawer.backButton.waitForDisplayed();
  };

  assertSeeCookiePolicyTitle = async () => {
    await CookiePolicyDrawer.drawerHeaderTitle.waitForDisplayed();
    await expect(await CookiePolicyDrawer.drawerHeaderTitle.getText()).to.equal(
      await t('browserView.settings.legal.cookiePolicy.title')
    );
  };

  assertSeeCookiePolicyContent = async () => {
    await CookiePolicyDrawer.cookiePolicyContent.waitForDisplayed();
    const actualCookiePolicyText = await CookiePolicyDrawer.cookiePolicyContent.getText();
    const expectedCookiePolicyText = readFromFile(__dirname, './cookiePolicy.txt');
    await expect(actualCookiePolicyText).to.equal(expectedCookiePolicyText);
  };
}

export default new CookiePolicyDrawerAssert();
