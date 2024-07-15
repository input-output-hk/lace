/* eslint-disable no-magic-numbers */
import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AssetActivityList, AssetActivityListProps } from '../AssetActivityList';
import { ActivityStatus } from '../../Transaction';
import { TransactionActivityType } from '../../ActivityDetail';

const activityTranslations = {
  asset: 'asset',
  token: 'token',
  delegation: 'Delegation',
  delegationDeregistration: 'Stake Key De-Registration',
  delegationRegistration: 'Stake Key Registration',
  rewards: 'Rewards',
  incoming: 'Received',
  outgoing: 'Sent',
  sending: 'Sending',
  self: 'Self transaction'
};

describe('Testing AssetActivityList component', () => {
  const props: AssetActivityListProps = {
    onExpand: jest.fn(),
    items: Array.from({ length: 12 }, () => ({
      type: TransactionActivityType.outgoing,
      name: 'Sent',
      description: 'ADA',
      date: new Date('2021-01-01'),
      formattedDate: 'Date',
      formattedTimestamp: '19:47',
      amount: '100 ADA',
      fiatAmount: '300 $',
      status: ActivityStatus.ERROR,
      assets: [{ id: '1', val: '1' }],
      translations: activityTranslations
    }))
  };

  test('should call the onExpand function when clicking the expand button', async () => {
    const { findByTestId } = render(<AssetActivityList {...props} />);
    const button = await findByTestId('expand-button');
    fireEvent.click(button);
    expect(props.onExpand).toHaveBeenCalled();
  });
});
