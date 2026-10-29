import { getProofServerEndpoint } from '@lace-contract/midnight-context';

import type { MidnightNetworkConfig } from '@lace-contract/midnight-context';

const validateHttpURL = (url: string): boolean => {
  try {
    const newUrl = new URL(url);
    return newUrl.protocol === 'http:' || newUrl.protocol === 'https:';
  } catch {
    return false;
  }
};

/** `in-process` mode has no URL — treated as valid. URL-bearing modes are checked. */
const isValidProofServer = (config: MidnightNetworkConfig): boolean => {
  const endpoint = getProofServerEndpoint(config.proofServer);
  return endpoint === undefined || validateHttpURL(endpoint);
};

export const isValidMidnightNetworkConfig = (config: MidnightNetworkConfig) =>
  validateHttpURL(config.nodeAddress) &&
  isValidProofServer(config) &&
  validateHttpURL(config.indexerAddress);
