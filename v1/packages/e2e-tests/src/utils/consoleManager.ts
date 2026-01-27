import { CDPSession } from 'puppeteer';
import { browser } from '@wdio/globals';
import extensionUtils from './utils';
import { Logger } from '../support/logger';

export interface ConsoleLogEntry {
  source: string;
  level: string;
  text: string;
  url: string;
  line: string;
  column: string;
}

// Timeout for CDP session creation - prevents hanging on unresponsive targets
const CDP_SESSION_TIMEOUT_MS = 10000;

/**
 * Create a CDP session with timeout to prevent hanging on unresponsive targets
 */
const createCDPSessionWithTimeout = async (
  target: any,
  timeoutMs: number = CDP_SESSION_TIMEOUT_MS
): Promise<CDPSession | null> => {
  return Promise.race([
    target.createCDPSession().then((session: CDPSession) => session),
    new Promise<null>((resolve) =>
      setTimeout(() => {
        Logger.warn(`[ConsoleManager] CDP session creation timed out for target: ${target.type()} - ${target.url()}`);
        resolve(null);
      }, timeoutMs)
    )
  ]);
};

export class ConsoleManager {
  private readonly CONSOLE_ENABLE = 'Console.enable';
  private static cdpSessions: CDPSession[] = [];
  private static capturedLogs: ConsoleLogEntry[] = [];

  startLogsCollection = async (): Promise<void> => {
    if ((await extensionUtils.getBrowser()) !== 'firefox') {
      await this.clearLogs();
      
      try {
        await browser.call(async () => {
          const puppeteer = await browser.getPuppeteer();
          
          // Wait a moment for Puppeteer to sync with the new browser session
          // This helps avoid stale target references after reloadSession()
          await new Promise((resolve) => setTimeout(resolve, 500));
          
          const targets = puppeteer
            .targets()
            .filter(
              (target) => target.type() === 'page' || target.type() === 'service_worker' || target.type() === 'other'
            );
          
          Logger.log(`[ConsoleManager] Starting logs collection for ${targets.length} targets`);
          
          const results = await Promise.all(
            targets.map(async (target) => {
              try {
                const client = await createCDPSessionWithTimeout(target);
                if (client) {
                  ConsoleManager.cdpSessions.push(client);
                  await client.send(this.CONSOLE_ENABLE);
                  client.on('Console.messageAdded', async (entry: any) => {
                    ConsoleManager.capturedLogs.push(entry.message);
                  });
                  return 'connected';
                }
                return 'timeout';
              } catch (e: any) {
                Logger.warn(`[ConsoleManager] Failed to create CDP session for ${target.type()}: ${e.message}`);
                return 'error';
              }
            })
          );
          
          const connected = results.filter((r) => r === 'connected').length;
          const timedOut = results.filter((r) => r === 'timeout').length;
          const errors = results.filter((r) => r === 'error').length;
          
          Logger.log(`[ConsoleManager] Logs collection: ${connected} connected, ${timedOut} timed out, ${errors} errors`);
        });
      } catch (e: any) {
        // Don't fail the test if logs collection fails - it's not critical
        Logger.warn(`[ConsoleManager] Failed to start logs collection: ${e.message}`);
      }
    } else {
      Logger.log('Logs collection not available in Firefox');
    }
  };

  clearLogs = async (): Promise<void> => {
    ConsoleManager.capturedLogs = [];
  };

  getLogs = async (): Promise<ConsoleLogEntry[]> => ConsoleManager.capturedLogs;

  getLogsAsString = async (): Promise<string | undefined> =>
    ConsoleManager.capturedLogs.map(({ text }) => text).join('\n');

  closeOpenedCdpSessions = async (): Promise<void> => {
    if ((await extensionUtils.getBrowser()) !== 'firefox') {
      await this.clearLogs();
      await Promise.all(
        ConsoleManager.cdpSessions.map(async (session) => {
          if (session.connection()) await session.detach();
        })
      );
      ConsoleManager.cdpSessions = [];
    }
  };
}

export default new ConsoleManager();
