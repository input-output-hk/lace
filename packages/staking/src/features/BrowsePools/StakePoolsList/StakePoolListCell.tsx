/* eslint-disable react/no-multi-comp */
import { Flex } from '@lace/ui';
import { ReactNode } from 'react';
import { StakePoolDetails } from '../../store';
import { getFormattedStakePoolProp } from '../formatters';
import { SortField } from '../types';
import { getSaturationLevel } from '../utils';
import * as styles from './StakePoolListCell.css';

type StakePoolListCellProps = Partial<StakePoolDetails> & {
  sortField: SortField;
};

const SaturationCell = ({ children: formattedValue, saturation }: { children: ReactNode; saturation: string }) => {
  const level = getSaturationLevel(Number.parseFloat(saturation));
  return (
    <Flex alignItems="center">
      <Flex mr="$6" className={styles.dot({ level })} />
      {formattedValue}
    </Flex>
  );
};

export const StakePoolListCell = ({ sortField, ...stakePool }: StakePoolListCellProps) => {
  if (!stakePool[sortField]) return null;

  const formattedValue = getFormattedStakePoolProp(stakePool as StakePoolDetails, sortField);

  // TODO do not use '-' as a fallback value; https://input-output.atlassian.net/browse/LW-10001
  if (sortField === 'saturation' && stakePool.saturation && stakePool.saturation !== '-') {
    return <SaturationCell saturation={stakePool.saturation}>{formattedValue}</SaturationCell>;
  }

  return <>{formattedValue}</>;
};
