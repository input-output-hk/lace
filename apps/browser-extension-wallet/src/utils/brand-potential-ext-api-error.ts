import { logger } from '@lace/common';

class ExtensionApiError extends Error {}

type BrandExtensionApiErrorOptions = {
  reThrow?: boolean;
};

export const brandPotentialExtApiError = async <T>(
  promise: Promise<T>,
  errorMessage: string,
  { reThrow = true }: BrandExtensionApiErrorOptions = {}
  // eslint-disable-next-line consistent-return
): Promise<T> => {
  try {
    return await promise;
  } catch (error) {
    logger.error(`Extension API error, ${errorMessage} due to:`, error);
    if (reThrow) {
      throw new ExtensionApiError(errorMessage);
    }
  }
};
