import fetch from 'node-fetch';
import { Logger } from '../support/logger';

const baseUrl = 'http://localhost:8000';

export const clickImageOnScreenshot = async (imageName: string): Promise<void> => {
  try {
    const requestOptions = {
      method: 'POST'
    };

    const response = await fetch(`${baseUrl}/click/${imageName}`, requestOptions);

    if (response.status === 200) {
      const data = await response.text();
      Logger.log(`Data received: ${data}`);
    } else {
      console.error('Error:', response.statusText);
    }
  } catch (error) {
    throw new Error(`An error occurred: ${error}`);
  }
};
