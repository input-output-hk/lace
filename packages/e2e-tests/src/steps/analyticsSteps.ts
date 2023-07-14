import { DataTable, When } from '@cucumber/cucumber';
import { expect } from 'chai';
import { browser } from '@wdio/globals';
import { dataTableAsStringArray } from '../utils/cucumberDataHelper';
import { getAllEventsNames, getLatestRequestEvents } from '../utils/postHogAnalyticsUtils';

When(/^I set up request interception for posthog analytics request\(s\)$/, async () => {
  await browser.pause(1000);
  await browser.setupInterceptor();
  await browser.excludeUrls([new RegExp('^(?!https://eu.posthog.com/e).*')]);
});

When(/^I validate latest analytics request event\(s\):$/, async (eventActionNames: DataTable) => {
  const expectedEventNames = dataTableAsStringArray(eventActionNames);
  await browser.pause(1000);
  for (const expectedEventName of expectedEventNames) {
    const actualEventNames = await getLatestRequestEvents(expectedEventNames.length);
    expect(actualEventNames).to.contains(expectedEventName);
  }
});

When(/^I validate that (\d+) analytics event\(s\) have been sent$/, async (numberOfRequests: number) => {
  expect((await getAllEventsNames()).length).to.equal(Number(numberOfRequests));
  await browser.disableInterceptor();
});
