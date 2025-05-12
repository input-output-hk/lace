import pidusage from 'pidusage';
import fs from 'fs';
import path from 'path';
import { exec } from 'node:child_process';
import { promisify } from 'util';
import { clearInterval } from 'node:timers';

const execAsync = promisify(exec);

interface UsageData {
  timestamp: string;
  cpu: number;
  memory: number;
}

class PidMonitor {
  private static _instance: PidMonitor;

  private pid: number | undefined;
  private readonly intervalMs: number;
  private _data: UsageData[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined = undefined;

  private constructor(intervalMs = 1000) {
    this.intervalMs = intervalMs;
  }

  public static getInstance(intervalMs = 1000): PidMonitor {
    if (!PidMonitor._instance) {
      PidMonitor._instance = new PidMonitor(intervalMs);
    }
    return PidMonitor._instance;
  }

  public get data(): UsageData[] {
    return this._data;
  }

  public async init(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        "ps aux | grep '[c]hrome.*--extension-process.*--enable-automation.*--test-type=webdriver' | awk '{print $2}'"
      );
      this.pid = Number(stdout.trim());
      return true;
    } catch (error) {
      console.error('Error finding PID:', error);
      return false;
    }
  }

  public start(): void {
    if (!this.pid) {
      throw new Error('PID is not set. Did you call init()?');
    }
    if (this.timer) return;

    const pid = this.pid;

    this.timer = setInterval(async () => {
      try {
        const stats = await pidusage(pid);
        this._data.push({
          timestamp: new Date().toISOString(),
          cpu: stats.cpu,
          memory: stats.memory
        });
      } catch {
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
  }

  public saveToFile(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(this._data, undefined, 2), 'utf-8');
  }
}

export default PidMonitor;
