import isNumber from 'lodash/isNumber';
import { PickByValue } from 'utility-types';
import { StakePoolDetails } from '../store';

type StakePoolFormattableKey = keyof Pick<
  StakePoolDetails,
  | 'activeStake'
  | 'blocks'
  | 'cost'
  | 'delegators'
  | 'liveStake'
  | 'margin'
  | 'name'
  | 'pledge'
  | 'ros'
  | 'saturation'
  | 'status'
  | 'ticker'
>;
type PercentageStakePoolKey = ('saturation' | 'ros' | 'margin') & StakePoolFormattableKey;
type NumberWithUnitStakePoolKey = keyof PickByValue<StakePoolDetails, { number: string; unit: string }> &
  StakePoolFormattableKey;

const percentageStakePoolKeys = new Set<PercentageStakePoolKey>(['saturation', 'ros', 'margin']);
const numberWithUnitStakePoolKeys = new Set<NumberWithUnitStakePoolKey>(['activeStake', 'cost', 'liveStake', 'pledge']);

const isNumberWithUnitKey = (key: keyof StakePoolDetails): key is NumberWithUnitStakePoolKey =>
  numberWithUnitStakePoolKeys.has(key as NumberWithUnitStakePoolKey);
const isPercentageKey = (key: keyof StakePoolDetails): key is PercentageStakePoolKey =>
  percentageStakePoolKeys.has(key as PercentageStakePoolKey);

export const formatNumberWithUnit = (value: { number: string; unit: string }): string =>
  `${value.number || '-'}${value.unit}`;

export const getFormattedStakePoolProp = (
  stakePool: Pick<StakePoolDetails, StakePoolFormattableKey>,
  key: StakePoolFormattableKey
): string => {
  const value = stakePool[key];
  if (!value && !isNumber(value)) return value;

  if (isNumberWithUnitKey(key)) {
    return formatNumberWithUnit(stakePool[key]);
  }

  if (isPercentageKey(key)) {
    return `${stakePool[key]}%`;
  }

  return stakePool[key];
};
