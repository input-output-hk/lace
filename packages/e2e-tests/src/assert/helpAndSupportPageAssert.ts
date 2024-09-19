import { browser } from '@wdio/globals';
import { expect } from 'chai';

class HelpAndSupportPageAssert {
  assertSeeHelpAndSupportPageURL = async () => {
    // might need to be updated in the future
    await browser.switchWindow('iohk.zendesk.com');
    const currentUrl = await browser.getUrl();
    const expectedUrl = 'https://iohk.zendesk.com/hc/en-us/requests/new';
    expect(currentUrl).to.equal(expectedUrl);
  };
}

export default new HelpAndSupportPageAssert();
