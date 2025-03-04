import fs from 'fs';
import { Logger } from '../support/logger';

export const getExtensionUUID = async (): Promise<string> => {
  const filePath = (browser.capabilities as Record<string, any>)['moz:profile'];
  const fileName = '/prefs.js';

  Logger.log(`Trying to get extension id from: ${filePath}${fileName}`);

  const data = fs.readFileSync(filePath + fileName, 'utf8');
  const match = data.match(/\\"lace-wallet-ext@lace\.io\\":\\"\b([\w-]+)\b\\"/);

  if (match) {
    return match[1];
  }
  throw new Error('UUID not found, aborting');
};
