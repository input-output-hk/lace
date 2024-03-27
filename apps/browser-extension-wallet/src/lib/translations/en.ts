/* eslint-disable sonarjs/no-duplicate-string */
import enjson from './en_flat.json';
import { cookiePolicy } from './cookie-policy.en';
import { legal } from './legal.en';

export const en = {
  ...cookiePolicy,
  ...legal,
  ...enjson
};
