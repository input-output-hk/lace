/* eslint-disable no-undef */

import { browser } from '@wdio/globals';

class AdaHandleAssert {
  public customHandleSrcValue = 'https://ipfs.blockfrost.dev/ipfs/zdj7WX1C4V25M3YwFkj8ySLAnKR2eCQZ76pn96CNMc27Es2LP';

  async assertSeeCustomImage(imageElement: WebdriverIO.Element) {
    await imageElement.scrollIntoView();
    await imageElement.waitForStable();
    await browser.waitUntil(async () => (await imageElement.getAttribute('src')) === this.customHandleSrcValue, {
      timeout: 10_000,
      timeoutMsg: 'failed while waiting for ada handle image'
    });
  }
}

export default new AdaHandleAssert();
