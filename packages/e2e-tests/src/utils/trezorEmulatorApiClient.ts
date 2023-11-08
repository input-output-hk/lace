import { Logger } from '../support/logger';

const baseUrl = 'http://localhost:8000';

export const clickImageOnScreenshot = async (imageName: string): Promise<void> => {
  try {
    const requestOptions = {
      method: 'POST'
    };

    const response = await fetch(`${baseUrl}/click/${imageName}`, requestOptions);

    response.ok ? Logger.log(`Response: ${await response.text()}`) : console.error('Error:', response.statusText);
  } catch (error) {
    throw new Error(`An error occurred: ${error}`);
  }
};
