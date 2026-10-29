import {
  CeremonyCancelledError,
  PrfUnsupportedError,
} from '@lace-contract/passport';
import {
  PasskeyCeremonyCancelledError,
  PasskeyPrfUnsupportedError,
} from '@lace-lib/passkey';

/** Preserve Passport error identity and retain the original failure as cause. */
export const asPassport = async <T>(
  operation: () => Promise<T>,
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof PasskeyCeremonyCancelledError)
      throw Object.assign(new CeremonyCancelledError(), { cause: error });
    if (error instanceof PasskeyPrfUnsupportedError)
      throw Object.assign(new PrfUnsupportedError(), { cause: error });
    throw error;
  }
};
