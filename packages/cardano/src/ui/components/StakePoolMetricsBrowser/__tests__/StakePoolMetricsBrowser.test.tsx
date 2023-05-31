/* eslint-disable no-magic-numbers */
import * as React from 'react';
import { render } from '@testing-library/react';
import { StakePoolMetricsBrowser, StakePoolMetricsBrowserProps } from '../StakePoolMetricsBrowser';
import '@testing-library/jest-dom';

describe('Testing StakePoolMetricsBrowser component', () => {
  const props: StakePoolMetricsBrowserProps = {
    apy: 45.5,
    saturation: 201,
    stake: { number: '12' },
    delegators: 20,
    translations: { activeStake: 'Active stake', saturation: 'Saturation', delegators: 'Delegators', apy: 'APY (M)' }
  };
  test('should display all stake pool metrics with icons', async () => {
    const { findByText } = render(<StakePoolMetricsBrowser {...props} />);
    const apyLabel = await findByText('APY (M)');
    const saturationLabel = await findByText('Saturation');
    const saturationValue = await findByText(props.saturation);
    const stakeLabel = await findByText('Active stake');
    const stakeValue = await findByText(props.stake.number);
    const delegatorsLabel = await findByText('Delegators');
    const delegatorsValue = await findByText(props.delegators);

    expect(apyLabel).toBeVisible();
    expect(saturationLabel).toBeVisible();
    expect(saturationValue).toBeVisible();
    expect(stakeLabel).toBeVisible();
    expect(stakeValue).toBeVisible();
    expect(delegatorsLabel).toBeVisible();
    expect(delegatorsValue).toBeVisible();
  });
});
