import 'i18next';
import type { Translations } from '../types/types';

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: {
      translation: Translations;
    };
  }
}
