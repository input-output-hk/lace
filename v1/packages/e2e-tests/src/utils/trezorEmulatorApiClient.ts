import { Logger } from '../support/logger';

const baseUrl = 'http://localhost:8000';
const requestOptions = {
  method: 'POST'
};

export const clickImageOnScreenshot = async (imageName: string): Promise<void> => {
  try {
    const response = await fetch(`${baseUrl}/click/${imageName}`, requestOptions);

    response.ok
      ? Logger.log(`Click response: ${await response.text()}`)
      : Logger.error(`Error on click: ${response.statusText}`);
  } catch (error) {
    throw new Error(`Failed to click image '${imageName}' on screenshot: ${error}`);
  }
};

export const holdImageOnScreenshot = async (imageName: string): Promise<void> => {
  try {
    const response = await fetch(`${baseUrl}/hold/${imageName}`, requestOptions);

    response.ok
      ? Logger.log(`Hold response: ${await response.text()}`)
      : Logger.error(`Error on hold: ${response.statusText}`);
  } catch (error) {
    throw new Error(`Failed to hold image '${imageName}' on screenshot: ${error}`);
  }
};

export const startEmulator = async (): Promise<void> => {
  try {
    const response = await fetch(`${baseUrl}/start-emulator`, requestOptions);

    response.ok
      ? Logger.log(`Emulator started: ${await response.text()}`)
      : Logger.error(`Error when starting emulator: ${response.statusText}`);
  } catch (error) {
    throw new Error(`Failed to start the emulator: ${error}`);
  }
};

export const stopEmulator = async (): Promise<void> => {
  try {
    const response = await fetch(`${baseUrl}/stop-emulator`, requestOptions);

    response.ok
      ? Logger.log(`Emulator stopped: ${await response.text()}`)
      : Logger.error(`Error when stopping emulator: ${response.statusText}`);
  } catch (error) {
    throw new Error(`Failed to stop the emulator: ${error}`);
  }
};

export const checkAndStartEmulator = async (): Promise<void> => {
  try {
    const response = await fetch(`${baseUrl}/is-emulator-running`, requestOptions);

    if (response.ok) {
      Logger.log(`Emulator is running: ${await response.text()}`);
    } else {
      await startEmulator();
    }
  } catch (error) {
    throw new Error(`Failed to check if emulator is running: ${error}`);
  }
};
