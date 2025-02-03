/* eslint-disable no-undef */

import { browser } from '@wdio/globals';

class AdaHandleAssert {
  public customHandleSrcValues = [
    'https://ipfs.blockfrost.dev/ipfs/zdj7WX1C4V25M3YwFkj8ySLAnKR2eCQZ76pn96CNMc27Es2LP',
    'blob:chrome-extension://gafhhkghbfjjkeiendhlofajokpaflmk/'
  ];

  async assertSeeCustomImage(imageElement: WebdriverIO.Element) {
    await imageElement.scrollIntoView();
    await imageElement.waitForStable();
    await browser.waitUntil(
      async () => {
        const src = await imageElement.getAttribute('src');
        return this.customHandleSrcValues.some((item) => src.includes(item));
      },
      {
        timeout: 20_000,
        timeoutMsg: 'Failed while waiting for Ada handle image.'
      }
    );
  }
}

export default new AdaHandleAssert();
