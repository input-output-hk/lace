import 'i18next';
import { Translations } from '../features/i18n/types';

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: {
      translation: Translations;
    };
  }
}
