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

export const validateEventProperty = async (event: string, property: string, propertyValue: string): Promise<void> => {
  await browser.waitUntil(
    async () => (await getEventPayload(event)).properties[property].toString() === propertyValue,
    {
      interval: 1000,
      timeout: 6000,
      timeoutMsg: `Failed while waiting for event '${event}' contains property '${property}' equal to ${propertyValue}. Actual event property value = '${
        (
          await getEventPayload(event)
        ).properties[property]
      }'`
    }
  );
};
When(/^I set up request interception for posthog analytics request\(s\)$/, async () => {
  await browser.pause(1000);
  await browser.setupInterceptor();
  await browser.excludeUrls([new RegExp('^(?!https://e.lw.iog.io).*')]);
});

When(/^I validate latest analytics multiple events:$/, async (eventActionNames: DataTable) => {
  const expectedEventNames = dataTableAsStringArray(eventActionNames);
  for (const expectedEventName of expectedEventNames) {
    await browser.waitUntil(
      async () => (await getLatestEventsNames(expectedEventNames.length)).includes(expectedEventName),
      {
        interval: 1000,
        timeout: 6000,
        timeoutMsg: `Failed while waiting for event ${expectedEventName}. \nActual events:\n ${(
          await getAllEventsNames()
        ).toString()}`
      }
    );
  }
});

When(/^I validate latest analytics single event "([^"]*)"$/, async (eventActionName: string) => {
  await browser.waitUntil(async () => (await getLatestEventsNames()).includes(eventActionName), {
    interval: 500,
    timeout: 6000,
    timeoutMsg: `Failed while waiting for event '${eventActionName}'. \nActual events:\n ${(
      await getAllEventsNames()
    ).toString()}`
  });
});

When(/^I validate that (\d+) analytics event\(s\) have been sent$/, async (numberOfRequests: number) => {
  await browser.waitUntil(async () => (await getAllEventsNames()).length === Number(numberOfRequests), {
    interval: 1000,
    timeout: 6000,
    timeoutMsg: `Failed while waiting for amount events sent: ${Number(numberOfRequests)}. Actual events amount sent: ${
      (
        await getAllEventsNames()
      ).length
    }\n
    Actual events:\n ${(await getAllEventsNames()).toString()}`
  });
  await browser.disableInterceptor();
});

When(/^I validate that alias event has assigned same user id "([^"]*)" in posthog$/, async (expectedUserID: string) => {
  await validateEventProperty('$create_alias', 'distinct_id', expectedUserID);
});

Then(/^I validate that event has correct properties$/, async () => {
  await browser.pause(2000);
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
    // '$os_version', it is not working for all os right now
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
  await browser.waitUntil(
    async () => Object.prototype.hasOwnProperty.call((await getLatestEventPayload()).properties, property),
    {
      interval: 1000,
      timeout: 6000,
      timeoutMsg: `Failed while waiting for latest event contains property ${property}`
    }
  );
});

Then(
  /^I validate that the "([^"]*)" event includes property "([^"]*)" with value "([^"]*)" in posthog$/,
  async (event: string, property: string, propertyValue: string) => {
    await validateEventProperty(event, property, propertyValue);
  }
);
