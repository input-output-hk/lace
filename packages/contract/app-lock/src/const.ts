import { Milliseconds } from '@lace-sdk/util';

import type { TranslationKey } from '@lace-contract/i18n';

const ONE_MINUTE_MS = Milliseconds(1 * 60 * 1000);
const TWO_MINUTES_MS = Milliseconds(2 * 60 * 1000);
const FIVE_MINUTES_MS = Milliseconds(5 * 60 * 1000);
const FIFTEEN_MINUTES_MS = Milliseconds(15 * 60 * 1000);
const THIRTY_MINUTES_MS = Milliseconds(30 * 60 * 1000);
const ONE_HOUR_MS = Milliseconds(1 * 60 * 60 * 1000);

/** Sentinel value meaning "never auto-lock". Used as a filter in the inactivity pipeline. */
export const INDEFINITE_INACTIVITY_TIMEOUT_MS = Milliseconds(
  Number.MAX_SAFE_INTEGER,
);

/** Option value used in the UI for the "never auto-lock" radio button. */
export const INDEFINITE_TIMEOUT_OPTION_VALUE = 'indefinite';

export const DEFAULT_INACTIVITY_TIMEOUT_MS = INDEFINITE_INACTIVITY_TIMEOUT_MS;
export const DEFAULT_INACTIVITY_TIMEOUT_MS_MOBILE = FIVE_MINUTES_MS;

export const INACTIVITY_TIMEOUT_OPTIONS: {
  value: string;
  labelKey: TranslationKey;
}[] = [
  {
    value: ONE_MINUTE_MS.toString(),
    labelKey: 'v2.app-lock.inactivity-timeout.option-1',
  },
  {
    value: TWO_MINUTES_MS.toString(),
    labelKey: 'v2.app-lock.inactivity-timeout.option-2',
  },
  {
    value: FIVE_MINUTES_MS.toString(),
    labelKey: 'v2.app-lock.inactivity-timeout.option-3',
  },
  {
    value: FIFTEEN_MINUTES_MS.toString(),
    labelKey: 'v2.app-lock.inactivity-timeout.option-4',
  },
  {
    value: THIRTY_MINUTES_MS.toString(),
    labelKey: 'v2.app-lock.inactivity-timeout.option-5',
  },
  {
    value: ONE_HOUR_MS.toString(),
    labelKey: 'v2.app-lock.inactivity-timeout.option-6',
  },
  {
    value: INDEFINITE_TIMEOUT_OPTION_VALUE,
    labelKey: 'v2.app-lock.inactivity-timeout.option-7',
  },
];
