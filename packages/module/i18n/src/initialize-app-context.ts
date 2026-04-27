import { DEFAULT_LANGUAGE } from '@lace-contract/i18n';
import i18next from 'i18next';

import { i18nextInit } from './i18next-init';

import type { AvailableAddons } from '.';
import type { InitializeAppContext } from '@lace-contract/app';
import type { ContextualLaceInit } from '@lace-contract/module';

const initializeAppContext: ContextualLaceInit<
  InitializeAppContext,
  AvailableAddons
> =
  ({ runtime: { env } }) =>
  async () =>
    i18nextInit({
      i18next,
      language: DEFAULT_LANGUAGE,
      environment: env,
    });

export default initializeAppContext;
