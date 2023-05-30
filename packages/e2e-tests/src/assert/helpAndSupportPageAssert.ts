import { browser } from '@wdio/globals';
import { expect } from 'chai';
import HelpAndSupportPage from '../elements/helpAndSupportPage';

class HelpAndSupportPageAssert {
  assertSeeHelpAndSupportPage = async () => {
    // might need to be updated in the future
    await browser.switchWindow('iohk.zendesk.com');
    const currentUrl = await browser.getUrl();
    const expectedUrl = 'https://iohk.zendesk.com/hc/en-us/requests/new';
    await expect(currentUrl).to.equal(expectedUrl);
    await HelpAndSupportPage.breadcrumbPart1.waitForDisplayed();
    await HelpAndSupportPage.breadcrumbPart2.waitForDisplayed();
  };
}

export default new HelpAndSupportPageAssert();
