import { getSystemLanguage } from '@lace-contract/i18n';
import { typedLaceContext } from '@lace-contract/module';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import { i18nextInit } from './i18next-init';
import { setupLanguageSubscription } from './store/setup-language-subscription';

import type { ActionCreators, AvailableAddons, Selectors } from '.';
import type { SupportedLanguage } from '@lace-contract/i18n';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { InitializeExtensionView } from '@lace-contract/views';

const initializeMobileView: ContextualLaceInit<
  InitializeExtensionView,
  AvailableAddons
> =
  ({ runtime: { env } }) =>
  async (store, context) => {
    const { selectors } = typedLaceContext<Selectors, ActionCreators>(context);

    const getLanguage = (): SupportedLanguage => {
      if (!selectors) {
        return getSystemLanguage();
      }

      const state = store.getState();
      const hasExplicitPreference =
        selectors.views.selectHasExplicitLanguagePreference(state);

      if (hasExplicitPreference) {
        return selectors.views.selectLanguage(state);
      }

      return getSystemLanguage();
    };

    setupLanguageSubscription({
      store,
      getLanguage,
    });

    return i18nextInit({
      i18next: i18next.use(initReactI18next),
      language: getLanguage(),
      environment: env,
      options: {
        debug: false,
        react: {
          useSuspense: false,
          transSupportBasicHtmlNodes: true,
        },
      },
    });
  };

export default initializeMobileView;
