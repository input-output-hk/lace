import CommonDrawerElements from '../elements/CommonDrawerElements';
import { expect } from 'chai';

class DrawerCommonExtendedAssert {
  async assertSeeDrawerWithTitle(expectedTitle: string, shouldSeeCloseButton = true) {
    const drawer = new CommonDrawerElements();
    await drawer.drawerBody.waitForDisplayed();
    shouldSeeCloseButton && (await drawer.drawerHeaderCloseButton.waitForClickable());
    await drawer.drawerHeaderTitle.waitForDisplayed({ timeout: 3000 });
    expect(await drawer.drawerHeaderTitle.getText()).to.equal(expectedTitle);
  }

  async assertSeeDrawer(shouldSee: boolean) {
    await new CommonDrawerElements().drawerBody.waitForClickable({
      reverse: !shouldSee,
      timeout: 2000,
      timeoutMsg: 'expected to not see drawer in 2s'
    });
  }
}

export default new DrawerCommonExtendedAssert();
