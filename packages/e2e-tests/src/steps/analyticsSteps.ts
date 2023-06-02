import { DataTable, When } from '@cucumber/cucumber';
import { URLSearchParams } from 'url';
import { expect } from 'chai';
import { browser } from '@wdio/globals';

export const getRequestInLatestOrderParams = async (requestIndexInLatestOrder: number): Promise<URLSearchParams> => {
  const requests = await browser.getRequests({ includePending: true, orderBy: 'START' });
  const decodedLatestRequestUrl = decodeURIComponent(requests[requests.length - 1 - requestIndexInLatestOrder].url);
  return new URLSearchParams(decodedLatestRequestUrl.split('?')[1]);
};

When(/^I set up request interception for (\d) matomo analytics request\(s\)$/, async (numberOfRequest: number) => {
  await browser.setupInterceptor();
  await browser.excludeUrls([new RegExp('^(?!https://matomo).*')]);
  for (let i = 0; i < numberOfRequest; i++) {
    await browser.expectRequest('GET', new RegExp('^https://matomo.*'), 200);
  }
});

When(/^I validate latest analytics request\(s\) information:$/, async (eventInfo: DataTable) => {
  await browser.pause(1000);
  for (let i = 0; i < eventInfo.rows().length; i++) {
    const requestIndexInLatestOrder = eventInfo.rows().length - 1 - i;
    const actualEventInfo = await getRequestInLatestOrderParams(requestIndexInLatestOrder);
    const [expectedEventCategory, expectedEventAction, expectedEventName] = eventInfo.rows()[i];
    expect(actualEventInfo.get('e_c')).to.equal(expectedEventCategory);
    expect(actualEventInfo.get('e_a')).to.equal(expectedEventAction);
    expect(actualEventInfo.get('e_n')).to.equal(expectedEventName);
  }
});

When(/^I validate existence and number of expected analytics request\(s\)$/, async () => {
  await browser.assertRequests();
  await browser.disableInterceptor();
});
