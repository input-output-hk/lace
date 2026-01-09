/* eslint-disable no-undef */
import { Logger } from '../support/logger';
import allure from '@wdio/allure-reporter';
import { CDPSession } from 'puppeteer';
import { browser } from '@wdio/globals';
import extensionUtils from './utils';

interface CountRequestOptions {
  targetTypes?: string[];
  printRequests?: boolean;
}

// Timeout for CDP session creation - prevents hanging on unresponsive targets
const CDP_SESSION_TIMEOUT_MS = 10000;

/**
 * Check if a Puppeteer target is valid and responsive.
 * After reloadSession(), Puppeteer may have stale targets from the old session.
 */
const isTargetValid = async (target: any): Promise<boolean> => {
  try {
    // Try to get target URL - this will fail fast for stale targets
    const url = target.url();
    
    // Skip obviously invalid targets
    if (!url || url === 'about:blank') {
      return false;
    }
    
    // For extension targets, verify it's our extension
    if (url.startsWith('chrome-extension://')) {
      return true; // Extension target, likely valid
    }
    
    // For other targets, check if page() returns something (for page targets)
    if (target.type() === 'page') {
      const page = await Promise.race([
        target.page(),
        new Promise((resolve) => setTimeout(() => resolve(null), 2000))
      ]);
      return page !== null;
    }
    
    return true; // Other target types (service_worker, other)
  } catch {
    return false; // Target threw an error, likely stale
  }
};

/**
 * Create a CDP session with timeout to prevent hanging on unresponsive targets
 */
const createCDPSessionWithTimeout = async (
  target: any,
  timeoutMs: number = CDP_SESSION_TIMEOUT_MS
): Promise<CDPSession | null> => {
  // First validate the target is not stale
  const valid = await isTargetValid(target);
  if (!valid) {
    Logger.warn(`[NetworkManager] Skipping stale/invalid target: ${target.type()} - ${target.url()}`);
    return null;
  }
  
  return Promise.race([
    target.createCDPSession().then((session: CDPSession) => session),
    new Promise<null>((resolve) =>
      setTimeout(() => {
        Logger.warn(`[NetworkManager] CDP session creation timed out for target: ${target.type()} - ${target.url()}`);
        resolve(null);
      }, timeoutMs)
    )
  ]);
};

/**
 * Send CDP command with timeout
 */
const sendCDPCommandWithTimeout = async (
  client: CDPSession,
  command: string,
  params?: any,
  timeoutMs: number = CDP_SESSION_TIMEOUT_MS
): Promise<boolean> => {
  try {
    await Promise.race([
      client.send(command as any, params),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${command} timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
    return true;
  } catch (error) {
    Logger.warn(`[NetworkManager] CDP command failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
};

export class NetworkManager {
  private readonly NETWORK_ENABLE = 'Network.enable';
  private static cdpSessions: CDPSession[] = [];

  finishWithResponseCode = async (urlPattern: string, responseCode: number): Promise<any> => {
    if ((await extensionUtils.getBrowser()) !== 'firefox') {
      await browser.call(async () => {
        const puppeteer = await browser.getPuppeteer();
        const targets = puppeteer
          .targets()
          .filter((target) => ['page', 'service_worker', 'other'].includes(target.type()));
        await Promise.all(
          targets.map(async (target) => {
            const client: CDPSession = (await target.createCDPSession()) as unknown as CDPSession;
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
          })
        );
      });
    } else {
      Logger.log('request interception not available in Firefox');
    }
  };

  failRequest = async (urlPattern: string): Promise<any> => {
    if ((await extensionUtils.getBrowser()) !== 'firefox') {
      await browser.call(async () => {
        const puppeteer = await browser.getPuppeteer();
        const targets = puppeteer
          .targets()
          .filter((target) => ['page', 'service_worker', 'other'].includes(target.type()));
        await Promise.all(
          targets.map(async (target) => {
            const client: CDPSession = (await target.createCDPSession()) as unknown as CDPSession;
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
          })
        );
      });
    } else {
      Logger.log('request interception not available in Firefox');
    }
  };

  logFailedRequests = async (): Promise<void> => {
    if ((await extensionUtils.getBrowser()) !== 'firefox') {
      await browser.call(async () => {
        const puppeteer = await browser.getPuppeteer();
        
        // Brief delay to allow browser to register targets after session changes
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        const targets = puppeteer
          .targets()
          .filter(
            (target) => target.type() === 'page' || target.type() === 'service_worker' || target.type() === 'other'
          );
        
        const results = await Promise.all(
          targets.map(async (target) => {
            try {
              const client = await createCDPSessionWithTimeout(target);
              if (!client) {
                return 'timeout';
              }
              
              NetworkManager.cdpSessions.push(client);
              const enabled = await sendCDPCommandWithTimeout(client, this.NETWORK_ENABLE);
              if (!enabled) {
                return 'enable_failed';
              }
              
              client.on('Network.responseReceived', async (request) => {
                if (request.response.status >= 400) {
                  const requestPayload = await this.getRequestPostData(client, request.requestId);
                  const responseBody = await this.getResponseBody(client, request.requestId);
                  const approximateTimestamp = new Date().toString();
                  const combinedFailedRequestInfo = `URL:\n${request.response.url}\n\nRESPONSE CODE:\n${request.response.status}\n\nAPPROXIMATE TIME:\n${approximateTimestamp}\n\nRESPONSE BODY:\n${responseBody}\n\nREQUEST PAYLOAD:\n${requestPayload}`;
                  allure.addAttachment('Failed request', combinedFailedRequestInfo, 'text/plain');
                  console.error(
                    'Failed request',
                    `URL: ${request.response.url}  |  RESPONSE CODE: ${request.response.status}`
                  );
                }
              });
              return 'connected';
            } catch (error) {
              Logger.warn(`[NetworkManager] Failed to setup failed request logging for ${target.type()}: ${error instanceof Error ? error.message : 'Unknown error'}`);
              return 'error';
            }
          })
        );
        
        const connected = results.filter((r) => r === 'connected').length;
        const timedOut = results.filter((r) => r === 'timeout').length;
        const enableFailed = results.filter((r) => r === 'enable_failed').length;
        const errors = results.filter((r) => r === 'error').length;
        
        if (timedOut > 0 || enableFailed > 0 || errors > 0) {
          Logger.log(`[NetworkManager] logFailedRequests: ${connected} connected, ${timedOut} timed out, ${enableFailed} enable failed, ${errors} errors`);
        }
      });
    } else {
      Logger.log('requests logging not available in Firefox');
    }
  };

  private requestCount = 0;

  async countSentRequests(options: CountRequestOptions = {}): Promise<void> {
    if (!browser.isChromium) {
      Logger.log('Requests logging with CDP not available in non-chromium browsers');
      return;
    }

    const { targetTypes = ['page', 'service_worker', 'other'], printRequests = false } = options;

    await browser.call(async () => {
      const puppeteer = await browser.getPuppeteer();
      const targets = puppeteer.targets().filter((target) => targetTypes.includes(target.type()));

      await Promise.all(
        targets.map(async (target) => {
          try {
            const client = await createCDPSessionWithTimeout(target);
            if (!client) {
              return;
            }
            
            NetworkManager.cdpSessions.push(client);
            const enabled = await sendCDPCommandWithTimeout(client, this.NETWORK_ENABLE);
            if (!enabled) {
              return;
            }
            
            client.on('Network.requestWillBeSent', (request) => {
              this.requestCount++;
              if (printRequests) {
                Logger.log(`Request #${this.requestCount}: ${request.request.url}`);
              }
            });
          } catch (error) {
            Logger.log(`CDP session error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
          }
        })
      );
    });
  }

  getRequestCount(): number {
    return this.requestCount;
  }

  resetRequestCount(): void {
    this.requestCount = 0;
  }

  closeOpenedCdpSessions = async (): Promise<void> => {
    if ((await extensionUtils.getBrowser()) !== 'firefox') {
      await Promise.all(
        NetworkManager.cdpSessions.map(async (session) => {
          if (session.connection()) await session.detach();
        })
      );
      NetworkManager.cdpSessions = [];
    }
  };

  private getRequestPostData = async (client: any, requestId: any): Promise<string> => {
    let postData = '';
    try {
      postData = JSON.stringify(await client.send('Network.getRequestPostData', { requestId }));
    } catch {
      /* empty */
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
