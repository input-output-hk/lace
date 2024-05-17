import { cookiePolicy } from './cookie-policy.en';
import enjson from './en.json';
import { legal } from './legal.en';

export const en = {
  ...cookiePolicy,
  ...legal,
  ...enjson,
};
