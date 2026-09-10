import type { I18nMessages } from './translations';
import type { I18nProvider } from './types';

declare module '@lace-contract/module' {
  interface SideEffectDependencies extends I18nProvider {}
}

declare module 'i18next' {
  interface CustomTypeOptions {
    // Keys are flat dot-notation; without this the typed t() splits on '.' and infers `never`.
    keySeparator: false;
    resources: {
      translation: I18nMessages;
    };
  }
}
