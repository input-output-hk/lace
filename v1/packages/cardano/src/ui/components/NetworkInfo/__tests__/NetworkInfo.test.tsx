import * as React from 'react';
import { render } from '@testing-library/react';
import { NetworkInfo, NetworkInfoProps } from '../NetworkInfo';
import '@testing-library/jest-dom';

describe('Testing NetworkInfo component', () => {
  // eslint-disable-next-line no-magic-numbers
  const fiveDays = 432_000_000;
  const props: NetworkInfoProps = {
    currentEpoch: '286',
    averageMargin: '42.3',
    averageRewards: '50',
    stakePoolsAmount: '2998',
    totalStakedPercentage: '55%',
    nextEpochIn: Date.now() + fiveDays,
    translations: {
      title: 'Network Info',
      currentEpoch: 'Current epoch',
      epochEnd: 'Epoch end',
      totalPools: 'Total pools',
      percentageStaked: '% staked',
      averageApy: 'Average APY',
      averageMargin: 'Average margin'
    }
  };
  test('should display current epoch, next epoch, avg margin, avg rewards, pool amount and stake %', async () => {
    const { findByText } = render(<NetworkInfo {...props} />);

    const currentEpoch = await findByText(props.currentEpoch);
    const nextEpochIn = await findByText(/^[0-4]d\s(([01]\d)?|2?[0-3])h\s([0-5]?\d)m\s([0-5]?\d)s$/);
    const stakePoolsAmount = await findByText(props.stakePoolsAmount);
    const stakedPercentage = await findByText(props.totalStakedPercentage);

    expect(currentEpoch).toBeVisible();
    expect(nextEpochIn).toBeVisible();
    expect(stakePoolsAmount).toBeVisible();
    expect(stakedPercentage).toBeVisible();
  });
});
