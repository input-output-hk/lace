import { filterRedacted } from '@lace-lib/util-redacted';
import { serializeError, type ErrorObject } from '@lace-lib/util-store';

import { AttestationError } from '../attested-proving-service';

import type { TranslationKey } from '@lace-contract/i18n';
import type { TxErrorTranslationKeys } from '@lace-contract/tx-executor';

const INSUFFICIENT_DUST_PATTERNS = [
  'Not enough Dust generated to pay the fee',
  'No dust tokens found in the wallet state',
] as const;

type MappedError = {
  errorTranslationKeys: TxErrorTranslationKeys;
  error?: ErrorObject;
};

const serializeMidnightError = (error: Error): ErrorObject =>
  filterRedacted({
    ...serializeError(error),
    // Effect errors serialize via toJSON(), which omits these display fields.
    name: error.name,
    message: error.message,
  }) as ErrorObject;

const isInsufficientDustError = (message: string): boolean =>
  INSUFFICIENT_DUST_PATTERNS.some(pattern => message.includes(pattern));

export const mapMidnightConfirmError = (error: Error): MappedError => ({
  errorTranslationKeys:
    error instanceof AttestationError
      ? {
          title: 'midnight.tee-attestation.failure.title',
          subtitle: 'midnight.tee-attestation.failure.recovery',
        }
      : {
          title: 'tx-executor.confirmation-error.generic.title',
          subtitle: 'tx-executor.confirmation-error.generic.subtitle',
        },
  error: serializeMidnightError(error),
});

export const mapMidnightSubmitError = (error: Error): MappedError => ({
  errorTranslationKeys: {
    title: 'tx-executor.submission-error.generic.title',
    subtitle: 'tx-executor.submission-error.generic.subtitle',
  },
  error: serializeMidnightError(error),
});

export const mapMidnightBuildError = (error: Error): TranslationKey => {
  const message = error.message ?? '';

  if (isInsufficientDustError(message)) {
    return 'tx-executor.building-error.insufficient-dust' as const;
  }

  return 'tx-executor.building-error.generic' as const;
};
