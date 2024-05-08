import enjson from './en.json';
import { translations } from '@lace/core';
import { cookiePolicy } from './cookie-policy.en';
import { legal } from './legal.en';

export const en = {
  ...cookiePolicy,
  ...legal,
  ...enjson,
  ...translations.en
};
