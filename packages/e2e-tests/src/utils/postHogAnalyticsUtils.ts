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

export const getAllEventsNames = async (): Promise<string[]> => {
  const filteredEventNames: string[] = [];
  const requests = await browser.getRequests({ includePending: true, orderBy: 'START' });
  for (const request of requests) {
    if (request.url.includes('blockfrost')) continue;
    const eventName = (await getRequestDataPayload(request)).event;
    // $pageview is technical event which is not relevant
    if (eventName !== '$pageview') {
      filteredEventNames.push(eventName);
    }
  }
  return filteredEventNames;
};

export const getLatestEventsNames = async (numberOfLatestRequest = 1): Promise<string[]> => {
  const allEventNames = await getAllEventsNames();
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
