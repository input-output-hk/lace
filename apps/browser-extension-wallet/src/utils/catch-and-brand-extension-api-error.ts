import { logger as commonLogger } from '@lace/common';
import { contextLogger } from '@cardano-sdk/util';

class ExtensionApiError extends Error {}

type CatchAndBrandExtensionApiErrorOptions = {
  reThrow?: boolean;
};

const logger = contextLogger(commonLogger, 'WebExtension:ApiError');

export const catchAndBrandExtensionApiError = async <T>(
  promise: Promise<T>,
  errorMessage: string,
  { reThrow = true }: CatchAndBrandExtensionApiErrorOptions = {}
  // eslint-disable-next-line consistent-return
): Promise<T> => {
  try {
    return await promise;
  } catch (error) {
    logger.error(errorMessage, error);
    if (reThrow) {
      throw new ExtensionApiError(errorMessage);
    }
  }
};
