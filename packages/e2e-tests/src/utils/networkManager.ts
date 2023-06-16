/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import { Logger } from '../support/logger';
import allure from '@wdio/allure-reporter';
import { CDPSession } from 'puppeteer-core/lib/esm/puppeteer/common/Connection';
import { browser } from '@wdio/globals';

export class NetworkManager {
  private readonly NETWORK_ENABLE = 'Network.enable';
  private static cdpSessions: CDPSession[] = [];

  isNetworkActivityPresentByPartialUrl = async (
    partialUrl: string,
    elementToClick?: ChainablePromiseElement<WebdriverIO.Element>,
    expectedQueryParams?: string[]
  ): Promise<boolean> => {
    let initialCondition = false;
    await browser.call(async () => {
      const puppeteer = await browser.getPuppeteer();
      const targets = puppeteer.targets().filter((target) => target.type() === 'page');
      targets.map(async (target) => {
        const client = await target.createCDPSession();
        NetworkManager.cdpSessions.push(client);
        await client.send(this.NETWORK_ENABLE);
        client.on('Network.requestWillBeSent', (params: any) => {
          if (params.request.url.includes(partialUrl)) {
            Logger.log(`Request match: ${partialUrl} => ${params.request.url}`);
            Logger.log(`expected params: ${expectedQueryParams}`);
            initialCondition = !expectedQueryParams
              ? true
              : expectedQueryParams.every((param: string) => params.request.url.includes(param));
          }
        });
      });
    });
    elementToClick ? await elementToClick.click() : await browser.refresh();
    await browser.pause(1000);

    return initialCondition;
  };

  changeNetworkCapabilitiesOfBrowser = async (offline: boolean): Promise<any> => {
    await browser.call(async () => {
      const puppeteer = await browser.getPuppeteer();
      const targets = puppeteer
        .targets()
        .filter(
          (target) => target.type() === 'page' || target.type() === 'service_worker' || target.type() === 'other'
        );
      targets.map(async (target) => {
        const client = await target.createCDPSession();
        NetworkManager.cdpSessions.push(client);
        await client.send(this.NETWORK_ENABLE);
        await client.send('Network.emulateNetworkConditions', {
          offline,
          latency: 0,
          downloadThroughput: 0,
          uploadThroughput: 0
        });
      });
    });
    await browser.pause(2000);
  };

  finishWithFailResponse = async (urlPattern: string, responseCode: number): Promise<any> => {
    await browser.call(async () => {
      const puppeteer = await browser.getPuppeteer();
      const targets = puppeteer
        .targets()
        .filter((target) => ['page', 'service_worker', 'other'].includes(target.type()));
      targets.map(async (target) => {
        const client = await target.createCDPSession();
        NetworkManager.cdpSessions.push(client);
        await client.send('Fetch.enable', {
          patterns: [{ urlPattern }]
        });
        client.on('Fetch.requestPaused', async ({ requestId, request }) => {
          Logger.log(`found request: ${request.url}, returning response code: ${responseCode} `);
          await client.send('Fetch.fulfillRequest', {
            requestId,
            responseCode: Number(responseCode),
            body: Buffer.from('{"__type": "Error"}').toString('base64')
          });
        });
      });
    });
  };

  failRequest = async (urlPattern: string): Promise<any> => {
    await browser.call(async () => {
      const puppeteer = await browser.getPuppeteer();
      const targets = puppeteer
        .targets()
        .filter((target) => ['page', 'service_worker', 'other'].includes(target.type()));
      targets.map(async (target) => {
        const client = await target.createCDPSession();
        NetworkManager.cdpSessions.push(client);
        await client.send('Fetch.enable', {
          patterns: [{ urlPattern }]
        });
        client.on('Fetch.requestPaused', async ({ requestId, request }) => {
          Logger.log(`found request: ${request.url}, failing request`);
          await client.send('Fetch.failRequest', {
            requestId,
            errorReason: 'Failed'
          });
        });
      });
    });
  };

  logFailedRequests = async (): Promise<void> => {
    await browser.call(async () => {
      const puppeteer = await browser.getPuppeteer();
      const targets = puppeteer
        .targets()
        .filter(
          (target) => target.type() === 'page' || target.type() === 'service_worker' || target.type() === 'other'
        );
      targets.map(async (target) => {
        const client = await target.createCDPSession();
        NetworkManager.cdpSessions.push(client);
        await client.send(this.NETWORK_ENABLE);
        client.on('Network.responseReceived', async (request) => {
          if (request.response.status >= 400) {
            const requestPayload = await this.getRequestPostData(client, request.requestId);
            const responseBody = await this.getResponseBody(client, request.requestId);
            const approximateTimestamp = new Date().toString();
            const combinedFailedRequestInfo = `URL:\n${request.response.url}\n\nRESPONSE CODE:\n${request.response.status}\n\nAPPROXIMATE TIME:\n${approximateTimestamp}\n\nRESPONSE BODY:\n${responseBody}\n\nREQUEST PAYLOAD:\n${requestPayload}`;
            allure.addAttachment('Failed request', combinedFailedRequestInfo, 'text/plain');
            console.log('Failed request');
            console.log(combinedFailedRequestInfo);
          }
        });
      });
    });
  };

  closeOpenedCdpSessions = async (): Promise<void> => {
    NetworkManager.cdpSessions.map(async (session) => {
      if (session.connection()) await session.detach();
    });
    NetworkManager.cdpSessions = [];
  };

  private getRequestPostData = async (client: any, requestId: any): Promise<string> => {
    let postData = '';
    try {
      postData = JSON.stringify(await client.send('Network.getRequestPostData', { requestId }));
    } catch (error) {
      Logger.warn(`${error}`);
    }
    return postData;
  };

  private getResponseBody = async (client: any, requestId: any): Promise<string> => {
    let responseBody = '';
    try {
      const getResponseBody = await client.send('Network.getResponseBody', { requestId });
      responseBody = getResponseBody.base64Encoded
        ? Buffer.from(getResponseBody.body, 'base64').toString('ascii')
        : getResponseBody.body;
    } catch (error) {
      Logger.warn(`${error}`);
    }
    return responseBody;
  };
}

export default new NetworkManager();
