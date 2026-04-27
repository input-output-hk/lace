import { filterRedacted } from '@lace-lib/util-redacted';
import { serializeError, type ErrorObject } from '@lace-lib/util-store';

import type { TxExecutorImplementationMethodName } from '../types';
import type { MapOfExecutorConfig } from './slice';

export const genericErrorResults: {
  [Type in TxExecutorImplementationMethodName]: (params?: {
    error?: Error;
  }) => MapOfExecutorConfig[Type]['result'];
} = {
  buildTx: () => ({
    errorTranslationKey: 'tx-executor.building-error.generic' as const,
    success: false,
  }),
  previewTx: () => ({ success: false }),
  confirmTx: ({ error } = {}) => ({
    error: error
      ? (filterRedacted(serializeError(error)) as ErrorObject)
      : undefined,
    errorTranslationKeys: {
      subtitle: 'tx-executor.confirmation-error.generic.subtitle',
      title: 'tx-executor.confirmation-error.generic.title',
    } as const,
    success: false,
  }),
  discardTx: () => ({
    success: false,
  }),
  submitTx: ({ error } = {}) => ({
    error: error
      ? (filterRedacted(serializeError(error)) as ErrorObject)
      : undefined,
    errorTranslationKeys: {
      subtitle: 'tx-executor.submission-error.generic.subtitle',
      title: 'tx-executor.submission-error.generic.title',
    } as const,
    success: false,
  }),
};
