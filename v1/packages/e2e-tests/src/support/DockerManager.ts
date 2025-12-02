import { exec } from 'node:child_process';
import path from 'node:path';

import { DockerComposeEnvironment, StartedDockerComposeEnvironment, Wait } from 'testcontainers';
import { Logger } from './logger';
import fs from 'fs/promises';
import { promisify } from 'node:util';
const execAsync = promisify(exec);

export class DockerManager {
  private static _composeEnvironment: StartedDockerComposeEnvironment;
  private static projectName = 'lw-hw-testing-toolkit-e2e';

  public static async isDockerRunning(): Promise<boolean> {
    return new Promise((resolve) => {
      exec('docker info', (error) => {
        resolve(!error);
      });
    });
  }

  public static async assertDockerStarted(): Promise<void> {
    if (!(await this.isDockerRunning())) {
      Logger.warn('Docker is not running. Please start Docker and try again.');
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit(1);
    }
  }

  // eslint-disable-next-line consistent-return
  public static async startLwHwTestingToolkit(): Promise<StartedDockerComposeEnvironment> {
    Logger.log('Spinning up docker compose environment for lw-hw-testing-toolkit');

    try {
      const composeFilePath = path.resolve(import.meta.dirname, '../compose/');

      const startedDockerComposeEnvironment = await new DockerComposeEnvironment(
        composeFilePath,
        'lw-hw-testing-toolkit.yml'
      )
        .withProjectName(this.projectName)
        .withWaitStrategy(this.projectName, Wait.forLogMessage('Trezor Device Manipulation API is running'))
        .up();

      Logger.log('Docker compose environment for lw-hw-testing-toolkit has started');

      return startedDockerComposeEnvironment;
    } catch (error) {
      Logger.error(`Failed to start Docker Compose environment: ${error}`);
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit(1);
    }
  }

  public static async startComposeFile(): Promise<void> {
    if (!this._composeEnvironment) {
      await this.assertDockerStarted();
      this._composeEnvironment = await this.startLwHwTestingToolkit();
    }
  }

  public static getContainer(): StartedDockerComposeEnvironment {
    return this._composeEnvironment;
  }

  public static async downDockerCompose(): Promise<void> {
    Logger.log('Tearing down docker compose.');
    await this.saveDockerLogs();
    await this._composeEnvironment.down();
  }

  public static async saveDockerLogs(): Promise<void> {
    try {
      const composeFilePath = path.resolve(import.meta.dirname, '../compose');
      const composeFile = 'lw-hw-testing-toolkit.yml';
      const logDir = path.resolve('./logs');
      await fs.mkdir(logDir, { recursive: true });

      const logFilePath = path.join(logDir, './docker-compose.log');

      const { stdout, stderr } = await execAsync(
        `docker compose -p ${this.projectName} -f ${composeFile} logs --no-color --timestamps`,
        { cwd: composeFilePath }
      );

      await fs.writeFile(logFilePath, stdout + stderr);
      Logger.log('Docker compose logs saved.');
    } catch (error) {
      Logger.warn(`Failed to save docker compose logs: ${error}`);
    }
  }
}
