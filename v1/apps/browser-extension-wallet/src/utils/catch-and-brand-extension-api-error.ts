import { logger as commonLogger } from '@lace/common';
import { ComposableError, contextLogger } from '@cardano-sdk/util';

class ExtensionApiError extends ComposableError {
  constructor(message: string, originalError: unknown) {
    super(message, originalError);
  }
}

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
    logger.warn(errorMessage, error);
    if (reThrow) {
      throw new ExtensionApiError(errorMessage, error);
    }
  }
};
