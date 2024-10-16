import { CDPSession } from 'puppeteer';
import { browser } from '@wdio/globals';

export interface ConsoleLogEntry {
  source: string;
  level: string;
  text: string;
  url: string;
  line: string;
  column: string;
}

export class ConsoleManager {
  private readonly CONSOLE_ENABLE = 'Console.enable';
  private static cdpSessions: CDPSession[] = [];
  private static capturedLogs: ConsoleLogEntry[] = [];

  startLogsCollection = async (): Promise<void> => {
    await this.clearLogs();
    await browser.call(async () => {
      const puppeteer = await browser.getPuppeteer();
      const targets = puppeteer
        .targets()
        .filter(
          (target) => target.type() === 'page' || target.type() === 'service_worker' || target.type() === 'other'
        );
      targets.map(async (target) => {
        const client: CDPSession = (await target.createCDPSession()) as unknown as CDPSession;
        ConsoleManager.cdpSessions.push(client);
        await client.send(this.CONSOLE_ENABLE);
        client.on('Console.messageAdded', async (entry: any) => {
          ConsoleManager.capturedLogs.push(entry.message);
        });
      });
    });
  };

  clearLogs = async (): Promise<void> => {
    ConsoleManager.capturedLogs = [];
  };

  getLogs = async (): Promise<ConsoleLogEntry[]> => ConsoleManager.capturedLogs;

  getLogsAsString = async (): Promise<string | undefined> => {
    let logs;
    for (const log of ConsoleManager.capturedLogs) {
      logs = `${logs} ${JSON.stringify(log)}`;
    }
    return logs;
  };

  closeOpenedCdpSessions = async (): Promise<void> => {
    await this.clearLogs();
    ConsoleManager.cdpSessions.map(async (session) => {
      if (session.connection()) await session.detach();
    });
    ConsoleManager.cdpSessions = [];
  };
}

export default new ConsoleManager();
