import type { MidnightNetworkConfig } from '@lace-contract/midnight-context';

const validateHttpURL = (url: string): boolean => {
  try {
    const newUrl = new URL(url);
    return newUrl.protocol === 'http:' || newUrl.protocol === 'https:';
  } catch {
    return false;
  }
};

export const getValidationErrorsForMidnightNetworkConfig = (
  config: MidnightNetworkConfig,
  httpUrlError: string,
): MidnightNetworkConfig => ({
  nodeAddress: validateHttpURL(config.nodeAddress) ? '' : httpUrlError,
  proofServerAddress: validateHttpURL(config.proofServerAddress)
    ? ''
    : httpUrlError,
  indexerAddress: validateHttpURL(config.indexerAddress) ? '' : httpUrlError,
});

export const isValidMidnightNetworkConfig = (config: MidnightNetworkConfig) =>
  validateHttpURL(config.nodeAddress) &&
  validateHttpURL(config.proofServerAddress) &&
  validateHttpURL(config.indexerAddress);
