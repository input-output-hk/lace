import { DataTable, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { browser } from '@wdio/globals';
import { dataTableAsStringArray } from '../utils/cucumberDataHelper';
import {
  getAllEventsNames,
  getEventPayload,
  getLatestEventPayload,
  getLatestEventsNames
} from '../utils/postHogAnalyticsUtils';

When(/^I set up request interception for posthog analytics request\(s\)$/, async () => {
  await browser.pause(1000);
  await browser.setupInterceptor();
  await browser.excludeUrls([new RegExp('^(?!https://eu.posthog.com/e).*')]);
});

When(/^I validate latest analytics multiple events:$/, async (eventActionNames: DataTable) => {
  const expectedEventNames = dataTableAsStringArray(eventActionNames);
  await browser.pause(1500);
  for (const expectedEventName of expectedEventNames) {
    const actualEventNames = await getLatestEventsNames(expectedEventNames.length);
    expect(actualEventNames).to.contains(expectedEventName);
  }
});

When(/^I validate latest analytics single event "([^"]*)"$/, async (eventActionName: string) => {
  await browser.pause(1300);
  const actualEventName = await getLatestEventsNames();
  expect(actualEventName).to.contains(eventActionName);
});

When(/^I validate that (\d+) analytics event\(s\) have been sent$/, async (numberOfRequests: number) => {
  await browser.pause(1000);
  expect((await getAllEventsNames()).length).to.equal(Number(numberOfRequests));
  await browser.disableInterceptor();
});

When(/^I validate that alias event has assigned same user id "([^"]*)" in posthog$/, async (expectedUserID: string) => {
  await browser.pause(1000);
  const actualAssignedID = (await getEventPayload('$create_alias')).properties.distinct_id;
  expect(actualAssignedID).to.equal(expectedUserID);
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
    'posthog_project_id',
    '$pathname',
    '$referrer',
    '$referring_domain',
    '$screen_height',
    '$screen_width',
    '$session_id',
    '$viewport_height',
    '$viewport_width',
    'sent_at_local',
    'view'
  ];
  for (const expectedProperty of expectedProperties) {
    expect(Object.prototype.hasOwnProperty.call(actualEventPayload.properties, expectedProperty)).to.be.true;
  }
  expect(Object.prototype.hasOwnProperty.call(actualEventPayload, 'timestamp')).to.be.true;
});

Then(/^I validate that the event includes "([^"]*)" property$/, async (property: string) => {
  await browser.pause(1000);
  const actualEventPayload = await getLatestEventPayload();
  const expectedProperties = [property];
  for (const expectedProperty of expectedProperties) {
    expect(Object.prototype.hasOwnProperty.call(actualEventPayload.properties, expectedProperty)).to.be.true;
  }
  expect(Object.prototype.hasOwnProperty.call(actualEventPayload, 'timestamp')).to.be.true;
});

Then(
  /^I validate that the "([^"]*)" event includes property "([^"]*)" with value "([^"]*)" in posthog$/,
  async (event: string, property: string, propertyValue: string) => {
    await browser.pause(1000);
    const actualPropertyValue = (await getEventPayload(event)).properties[property];
    console.log(actualPropertyValue);
    expect(actualPropertyValue).to.equal(propertyValue);
  }
);
