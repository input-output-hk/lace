import { browser } from '@wdio/globals';

const getEventNamesFromRequest = (request: any): Promise<string> => {
  const requestPayloadBase64Data = decodeURIComponent(String(request.body)).replace('data=', '');
  const decodedLatestRequestData = JSON.parse(Buffer.from(requestPayloadBase64Data, 'base64').toString('ascii'));
  return decodedLatestRequestData.event;
};

export const getAllEventsNames = async (): Promise<string[]> => {
  const filteredEventNames: string[] = [];
  const requests = await browser.getRequests({ includePending: true, orderBy: 'START' });
  for (const request of requests) {
    const eventNames = await getEventNamesFromRequest(request);
    // $pageview is technical event which is not relevant
    if (eventNames !== '$pageview') {
      filteredEventNames.push(eventNames);
    }
  }
  return filteredEventNames;
};

export const getLatestRequestEvents = async (numberOfLatestRequest = 1): Promise<string[]> => {
  const allEventNames = await getAllEventsNames();
  return allEventNames.slice(-numberOfLatestRequest);
};
