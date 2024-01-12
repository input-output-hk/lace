import crypto from 'crypto';

export const removeWhitespacesFromText = async (text: string): Promise<string> => text.replace(/[\s/]+/g, ' ').trim();

export const generateRandomString = async (length: number): Promise<string> =>
  crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
