import { browser } from '@wdio/globals';

const getRequestDataPayload = async (request: any): Promise<any> => {
  if (!request.body) {
    console.warn('Request body is undefined');
    return {};
  }

  const requestBody = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);

  try {
    return JSON.parse(requestBody);
  } catch {
    const requestPayloadBase64Data = decodeURIComponent(requestBody).replace('data=', '');
    return JSON.parse(Buffer.from(requestPayloadBase64Data, 'base64').toString('ascii'));
  }
};

export const getAllPostHogEventNames = async (): Promise<string[]> => {
  const postHogEventNames: string[] = [];
  const requests = await browser.getRequests({ includePending: true, orderBy: 'START' });
  for (const request of requests) {
    if (request.url.includes('blockfrost')) continue; // Skip Blockfrost-related calls
    const eventName = (await getRequestDataPayload(request)).event;
    postHogEventNames.push(eventName);
  }
  return postHogEventNames;
};

export const getAllAnalyticsEventsNames = async (): Promise<string[]> => {
  const postHogEventNames = await getAllPostHogEventNames();
  return postHogEventNames.filter(
    (eventName) => !['$pageview', '$feature_flag_called', '$create_alias'].includes(eventName)
  );
};

export const getLatestAnalyticsEventsNames = async (numberOfLatestRequest = 1): Promise<string[]> => {
  const allEventNames = await getAllAnalyticsEventsNames();
  return allEventNames.slice(-numberOfLatestRequest);
};

export const getLatestEventPayload = async (): Promise<any> => {
  const requests = await browser.getRequests({ includePending: true, orderBy: 'START' });
  return getRequestDataPayload(requests.pop());
};

export const getEventPayload = async (expectedEventName: string): Promise<any> => {
  const requests = await browser.getRequests({ includePending: true, orderBy: 'START' });
  for (const request of requests) {
    const payload = await getRequestDataPayload(request);
    if (payload.event === expectedEventName) {
      return payload;
    }
  }
  throw new Error(`Event with name ${expectedEventName} not found`);
};

export const getPostHogEvent = async (expectedEventName: string): Promise<string | undefined> => {
  const postHogEventNames = await getAllPostHogEventNames();
  const foundName = postHogEventNames.find((eventName) => eventName === expectedEventName);
  return foundName ? await getEventPayload(foundName) : undefined;
};
