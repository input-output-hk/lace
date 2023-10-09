/* eslint-disable no-magic-numbers */
import * as React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GroupedAssetActivityList, GroupedAssetActivityListProps } from '../GroupedAssetActivityList';
import { AssetActivityItemProps } from '../AssetActivityItem';

const activityItem: AssetActivityItemProps = {
  type: 'outgoing',
  amount: '100 ADA',
  fiatAmount: '300 $',
  formattedDate: 'FormattedDate',
  formattedTimestamp: 'FormattedTimestamp',
  date: new Date('2021-01-01'),
  assetsNumber: 1,
  assets: [{ id: '1', val: '1' }]
};

describe('Testing GroupedAssetActivityList component', () => {
  const props: GroupedAssetActivityListProps = {
    lists: [
      {
        title: 'Today',
        items: Array.from({ length: 2 }, () => activityItem)
      },
      {
        title: 'Sun, 31 Aug',
        items: Array.from({ length: 4 }, () => activityItem)
      }
    ]
  };

  test('should render two lists', async () => {
    const { findAllByTestId } = render(<GroupedAssetActivityList {...props} />);
    const items = await findAllByTestId('grouped-asset-activity-list-item');
    expect(items).toHaveLength(2);
  });
});
