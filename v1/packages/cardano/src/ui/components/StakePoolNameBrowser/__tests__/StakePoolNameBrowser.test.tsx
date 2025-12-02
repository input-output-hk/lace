/* eslint-disable no-magic-numbers */
import * as React from 'react';
import { render } from '@testing-library/react';
import { StakePoolNameBrowser, StakePoolNameBrowserProps } from '../StakePoolNameBrowser';
import '@testing-library/jest-dom';

describe('Testing StakePoolNameBrowser component', () => {
  const name = 'name';
  const ticker = 'ticker';
  const props: StakePoolNameBrowserProps = {
    name,
    ticker,
    isDelegated: true,
    translations: { retiring: 'retiring', retired: 'retired', delegating: 'delegating', saturated: 'saturated' }
  };
  test('should display all stake pool metrics with icons', async () => {
    const { findByText, findByTestId } = render(<StakePoolNameBrowser {...props} />);
    const roiLabel = await findByTestId('stake-pool-item-logo');
    const nameValue = await findByText(name);
    const tickerValue = await findByText(ticker);

    expect(roiLabel).toBeVisible();
    expect(nameValue).toBeVisible();
    expect(tickerValue).toBeVisible();
  });
});
