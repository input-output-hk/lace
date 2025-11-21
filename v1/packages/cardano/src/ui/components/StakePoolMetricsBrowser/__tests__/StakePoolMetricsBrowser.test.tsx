/* eslint-disable no-magic-numbers */
import * as React from 'react';
import { render } from '@testing-library/react';
import { StakePoolMetricsBrowser, StakePoolMetricsBrowserProps } from '../StakePoolMetricsBrowser';
import '@testing-library/jest-dom';

describe('Testing StakePoolMetricsBrowser component', () => {
  const ros = { t: 'ROS', testId: 'ros', unit: '%', value: 45.5 };
  const delegators = { t: 'Delegators', testId: 'delegators', value: 20 };
  const saturation = { t: 'Saturation', testId: 'saturation', unit: '%', value: 201 };
  const activeStake = { t: 'Active stake', testId: 'active-stake', unit: 'K', value: '12' };
  const data = [ros, delegators, saturation, activeStake];
  const props: StakePoolMetricsBrowserProps = {
    data
  };
  test('should display all stake pool metrics with icons', async () => {
    const { findByText } = render(<StakePoolMetricsBrowser {...props} />);
    const rosLabel = await findByText(ros.t);
    const saturationLabel = await findByText(saturation.t);
    const saturationValue = await findByText(saturation.value);
    const stakeLabel = await findByText(activeStake.t);
    const stakeValue = await findByText(activeStake.value);
    const delegatorsLabel = await findByText(delegators.t);
    const delegatorsValue = await findByText(delegators.value);

    expect(rosLabel).toBeVisible();
    expect(saturationLabel).toBeVisible();
    expect(saturationValue).toBeVisible();
    expect(stakeLabel).toBeVisible();
    expect(stakeValue).toBeVisible();
    expect(delegatorsLabel).toBeVisible();
    expect(delegatorsValue).toBeVisible();
  });
});
