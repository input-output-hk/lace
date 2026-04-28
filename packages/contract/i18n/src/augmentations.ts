import type { I18nMessages } from './translations';
import type { I18nProvider } from './types';

declare module '@lace-contract/module' {
  interface SideEffectDependencies extends I18nProvider {}
}

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: {
      translation: I18nMessages;
    };
  }
}
