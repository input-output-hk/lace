import type { FailureId } from './value-objects';
import type { TranslationKey } from '@lace-contract/i18n';
import type { Action } from '@lace-contract/module';

/**
 * Represents a failure that can be displayed to the user and optionally retried.
 *
 * @property failureId - Stable identifier for the failure (enables auto-dismissal)
 * @property message - Translation key for the error message to display
 * @property retryAction - Optional action to dispatch when user clicks "Try Again"
 */
export type Failure = {
  failureId: FailureId;
  message: TranslationKey;
  retryAction?: Action;
};
