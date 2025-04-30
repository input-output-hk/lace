import { exec } from 'node:child_process';
import path from 'node:path';

import { DockerComposeEnvironment, StartedDockerComposeEnvironment, Wait } from 'testcontainers';
import { Logger } from './logger';

export class DockerManager {
  private static _composeEnvironment: StartedDockerComposeEnvironment;

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

  public static async startLwHwTestingToolkit(): Promise<StartedDockerComposeEnvironment> {
    Logger.log('Spinning up docker compose environment for lw-hw-testing-toolkit');

    try {
      const composeFilePath = path.resolve(import.meta.dirname, '../compose/');

      const startedDockerComposeEnvironment = await new DockerComposeEnvironment(
        composeFilePath,
        'lw-hw-testing-toolkit.yml'
      )
        .withWaitStrategy('lw-hw-testing-toolkit-e2e', Wait.forLogMessage('Trezor Device Manipulation API is running'))
        .up();

      Logger.log('Docker compose environment for lw-hw-testing-toolkit has started');

      return startedDockerComposeEnvironment;
    } catch (error) {
      Logger.warn(`Failed to start Docker Compose environment: ${error}`);
      throw error;
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
    await this._composeEnvironment.down();
  }
}
