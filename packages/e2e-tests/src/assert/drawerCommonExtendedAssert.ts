import webTester from '../actor/webTester';
import { DrawerCommonExtended } from '../elements/drawerCommonExtended';
import { browser } from '@wdio/globals';

class DrawerCommonExtendedAssert {
  async assertSeeDrawerWithTitle(expectedTitle: string, shouldSeeCloseButton = true) {
    const drawer = new DrawerCommonExtended();
    await webTester.seeWebElement(drawer.container());
    shouldSeeCloseButton && (await webTester.seeWebElement(drawer.closeButton()));
    await webTester.waitUntilSeeElement(drawer.titleElement());
    await this.assertSeeTitle(expectedTitle);
  }

  async assertSeeTitle(expectedTitle: string) {
    await browser.waitUntil(
      async () => (await new DrawerCommonExtended().getTitle()).toString().includes(expectedTitle),
      {
        timeout: 3000,
        interval: 500,
        timeoutMsg: `expected title ${expectedTitle} was not displayed`
      }
    );
  }

  async assertSeeDrawer(shouldSee: boolean) {
    await $(new DrawerCommonExtended().drawerBodyContainer().toJSLocator()).waitForClickable({
      reverse: !shouldSee,
      timeout: 2000,
      timeoutMsg: 'expected to not see drawer in 2s'
    });
  }
}

export default new DrawerCommonExtendedAssert();
