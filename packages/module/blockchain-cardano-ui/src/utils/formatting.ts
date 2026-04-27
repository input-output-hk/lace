import type { Percent } from '@cardano-sdk/util';
import type { TranslationKey, TFunction } from '@lace-contract/i18n';

export const DEFAULT_DECIMALS = 2;

type FormatPercentagesOptions = {
  decimalPlaces?: number;
  // rounding terminology inspired by bignumber.js
  // https://mikemcl.github.io/bignumber.js/#constructor-properties
  rounding?: 'down' | 'halfUp';
};

export const formatPercentages = (
  value: Percent | number,
  {
    decimalPlaces = DEFAULT_DECIMALS,
    rounding = 'halfUp',
  }: FormatPercentagesOptions = {},
): string => {
  const unroundedValue = value.valueOf() * Math.pow(10, decimalPlaces) * 100;
  let roundedValue: number;
  switch (rounding) {
    case 'down':
      roundedValue = Math.floor(unroundedValue);
      break;
    case 'halfUp':
      roundedValue = Math.round(unroundedValue);
      break;
  }

  return (roundedValue / Math.pow(10, decimalPlaces)).toFixed(decimalPlaces);
};

export const capitalizeFirstLetter = (word: string): string =>
  `${word[0]?.toLocaleUpperCase() ?? ''}${word.slice(1)}`;

export const activityTypeTranslationKeyById: Partial<
  Record<string, TranslationKey>
> = {
  Rewards: 'v2.activity-details.sheet.rewards',
  Send: 'activity.history.send',
  Receive: 'activity.history.receive',
};

export const getActivityTypeLabel = (
  t: TFunction,
  activityType?: string | null,
): string | undefined => {
  if (!activityType) return;
  const key = activityTypeTranslationKeyById[String(activityType)];
  return key ? t(key) : undefined;
};
