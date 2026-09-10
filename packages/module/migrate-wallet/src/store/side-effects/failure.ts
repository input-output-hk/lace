import { of } from 'rxjs';

import { deviceHintKey } from './device-hint';

import type { SideEffect } from '../..';
import type { TranslationKey } from '@lace-contract/i18n';

type SideEffectDeps = Parameters<SideEffect>[2];

export const failure = (
  dependencies: SideEffectDeps,
  errorKey: TranslationKey,
  error?: unknown,
) => {
  dependencies.logger.warn(`[migrate-wallet] ${errorKey}`, error);
  return of(
    dependencies.actions.migrateWallet.stepFailed({
      errorKey,
      deviceHintKey: deviceHintKey(error),
    }),
  );
};
