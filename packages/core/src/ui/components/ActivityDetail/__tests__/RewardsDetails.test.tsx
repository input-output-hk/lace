/* eslint-disable no-magic-numbers */
import * as React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RewardsDetails, RewardsDetailsProps } from '../RewardsDetails';
import { ActivityStatus } from '../../Transaction';

describe('Testing ActivityDetailsBrowser component', () => {
  const rewardsDetailsProps: RewardsDetailsProps = {
    name: 'Name',
    headerDescription: 'Header Description',
    status: ActivityStatus.SPENDABLE,
    includedDate: 'Date',
    includedTime: 'Time',
    amountTransformer: (amount) => `${amount} $`,
    coinSymbol: 'ADA',
    rewards: {
      totalAmount: 'Amount',
      spendableEpoch: 47,
      rewards: [
        {
          pool: { name: 'pool1', ticker: 'A', id: '1' },
          amount: '10'
        },
        {
          pool: { name: 'pool2', ticker: 'B', id: '2' },
          amount: '10'
        }
      ]
    }
  };

  test('should display rewards detail bundle', async () => {
    const { findByTestId } = render(<RewardsDetails {...rewardsDetailsProps} />);

    const container = await findByTestId('rewards-detail-bundle');
    expect(container).toBeVisible();
  });

  test('should display rewards pools bundle', async () => {
    const { findAllByTestId } = render(<RewardsDetails {...rewardsDetailsProps} />);

    const containers = await findAllByTestId('rewards-pool-name');

    expect(containers).toHaveLength(2);
    containers.forEach((c) => expect(c).toBeVisible());
  });

  test('should display rewards epoch', async () => {
    const { findByTestId } = render(<RewardsDetails {...rewardsDetailsProps} />);

    const dateContainer = await findByTestId('rewards-epoch');
    expect(dateContainer).toBeVisible();
  });

  test('should display rewards date and time', async () => {
    const { findByTestId } = render(<RewardsDetails {...rewardsDetailsProps} />);

    const dateContainer = await findByTestId('rewards-date');
    expect(dateContainer).toBeVisible();
  });
});
