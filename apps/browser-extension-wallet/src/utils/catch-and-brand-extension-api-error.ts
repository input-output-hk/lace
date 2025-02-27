import { logger } from '@lace/common';

class ExtensionApiError extends Error {}

type CatchAndBrandExtensionApiErrorOptions = {
  reThrow?: boolean;
};

export const catchAndBrandExtensionApiError = async <T>(
  promise: Promise<T>,
  errorMessage: string,
  { reThrow = true }: CatchAndBrandExtensionApiErrorOptions = {}
  // eslint-disable-next-line consistent-return
): Promise<T> => {
  try {
    return await promise;
  } catch (error) {
    const message = `${errorMessage} due to: ${error}`;
    logger.error(`[WebExtension API error] ${message}`);
    if (reThrow) {
      throw new ExtensionApiError(errorMessage);
    }
  }
};
