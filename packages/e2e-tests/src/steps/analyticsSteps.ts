import { DataTable, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { browser } from '@wdio/globals';
import { dataTableAsStringArray } from '../utils/cucumberDataHelper';
import {
  getAllEventsNames,
  getLatestEventPayload,
  getLatestEventsNames,
  getLatestEventsNamesOrder
} from '../utils/postHogAnalyticsUtils';

When(/^I set up request interception for posthog analytics request\(s\)$/, async () => {
  await browser.pause(1000);
  await browser.setupInterceptor();
  await browser.excludeUrls([new RegExp('^(?!https://eu.posthog.com/e).*')]);
});

When(/^I validate latest analytics muliple events:$/, async (eventActionNames: DataTable) => {
  const expectedEventNames = dataTableAsStringArray(eventActionNames);
  await browser.pause(1000);
  for (const expectedEventName of expectedEventNames) {
    const actualEventNames = await getLatestEventsNames(expectedEventNames.length);
    expect(actualEventNames).to.contains(expectedEventName);
  }
});

When(/^I validate latest analytics single event "([^"]*)"$/, async (eventActionName: string) => {
  await browser.pause(1000);
  const actualEventName = await getLatestEventsNames();
  expect(actualEventName).to.contains(eventActionName);
});

When(/^I validate that (\d+) analytics event\(s\) have been sent$/, async (numberOfRequests: number) => {
  expect((await getAllEventsNames()).length).to.equal(Number(numberOfRequests));
  await browser.disableInterceptor();
});

When(/^I validate ([^"]*) latest analytics single event "([^"]*)"$/, async (order: string, eventActionName: string) => {
  await browser.pause(1000);
  const actualEventName = await getLatestEventsNamesOrder(order);
  expect(actualEventName).to.contains(eventActionName);
});

Then(/^I validate that event has correct properties$/, async () => {
  await browser.pause(1000);
  const actualEventPayload = await getLatestEventPayload();
  const expectedProperties = [
    '$current_url',
    '$window_id',
    '$browser',
    '$browser_language',
    '$browser_version',
    '$device_type',
    '$host',
    '$insert_id',
    '$lib',
    '$lib_version',
    '$lib_version',
    '$os',
    '$os_version',
    '$pageview_id',
    '$pathname',
    '$referrer',
    '$referring_domain',
    '$screen_height',
    '$screen_width',
    '$session_id',
    '$viewport_height',
    '$viewport_width',
    'sent_at_local',
    'view',
    'url'
  ];
  for (const expectedProperty of expectedProperties) {
    expect(Object.prototype.hasOwnProperty.call(actualEventPayload.properties, expectedProperty)).to.be.true;
  }
  expect(Object.prototype.hasOwnProperty.call(actualEventPayload, 'timestamp')).to.be.true;
});
