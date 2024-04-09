import enjson from './en.json';
import { cookiePolicy } from './cookie-policy.en';
import { legal } from './legal.en';

export const en = {
  ...cookiePolicy,
  ...legal,
  ...enjson
};
