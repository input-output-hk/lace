import { browser } from '@wdio/globals';

const getRequestDataPayload = async (request: any): Promise<any> => {
  const requestPayloadBase64Data = decodeURIComponent(String(request.body)).replace('data=', '');
  return JSON.parse(Buffer.from(requestPayloadBase64Data, 'base64').toString('ascii'));
};

export const getAllEventsNames = async (): Promise<string[]> => {
  const filteredEventNames: string[] = [];
  const requests = await browser.getRequests({ includePending: true, orderBy: 'START' });
  for (const request of requests) {
    const eventNames = (await getRequestDataPayload(request)).event;
    // $pageview is technical event which is not relevant
    if (eventNames !== '$pageview') {
      filteredEventNames.push(eventNames);
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
