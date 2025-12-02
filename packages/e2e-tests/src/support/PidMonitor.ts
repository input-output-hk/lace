import pidusage from 'pidusage';
import fs from 'fs';
import path from 'path';
import { exec } from 'node:child_process';
import { promisify } from 'util';
import { clearInterval } from 'node:timers';
import { Logger } from './logger';

const execAsync = promisify(exec);

interface UsageData {
  timestamp: number;
  cpu: number;
  memory: number;
}

interface OutputData {
  scenarioName: string | undefined;
  data: UsageData[];
}

class PidMonitor {
  private static _instance: PidMonitor;

  private pid?: number;
  private readonly intervalMs: number;
  private _data: UsageData[] = [];
  private timer?: ReturnType<typeof setInterval>;
  private scenarioName: string | undefined = undefined;

  private constructor(intervalMs = 1000) {
    this.intervalMs = intervalMs;
  }

  public static getInstance(intervalMs = 1000): PidMonitor {
    if (!PidMonitor._instance) {
      PidMonitor._instance = new PidMonitor(intervalMs);
    }
    return PidMonitor._instance;
  }

  public setScenarioName(name: string): void {
    this.scenarioName = name;
  }

  public get data(): UsageData[] {
    return this._data;
  }

  public async init(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        "ps aux | grep '[c]hrome.*--extension-process.*--enable-automation.*--test-type=webdriver' | awk '{print $2}'"
      );
      const pid = Number(stdout.trim());

      if (Number.isNaN(pid)) {
        Logger.error(`Parsed PID is NaN from stdout: "${stdout}"`);
        return false;
      }

      this.pid = pid;
      return true;
    } catch (error) {
      Logger.error(`Error finding PID: ${error}`);
      return false;
    }
  }

  public start(): void {
    if (this.pid === undefined) {
      Logger.warn('PID is not set. Call init() first.');
      return;
    }

    if (this.timer) return;

    this.timer = setInterval(async () => {
      if (this.pid === undefined) return;

      try {
        const stats = await pidusage(this.pid);
        this._data.push({
          timestamp: Date.now(),
          cpu: stats.cpu,
          memory: stats.memory
        });
      } catch (error) {
        Logger.error(`pidusage failed: ${error}`);
        this.stop();
      }
    }, this.intervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  public clear(): void {
    this._data = [];
    this.scenarioName = undefined;
  }

  public saveToFile(filePath: string): void {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const output: OutputData = {
        scenarioName: this.scenarioName,
        data: this._data
      };

      fs.writeFileSync(filePath, JSON.stringify(output, undefined, 2), 'utf-8');
    } catch (error) {
      Logger.error(`Failed to save data to file: ${error}`);
    }
  }
}

export default PidMonitor;
