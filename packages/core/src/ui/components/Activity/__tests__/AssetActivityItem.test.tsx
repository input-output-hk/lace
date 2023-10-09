/* eslint-disable max-len */
import * as React from 'react';
import { render, within, fireEvent, queryByTestId } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AssetActivityItem, AssetActivityItemProps, TransactionStatus } from '../AssetActivityItem';

const assetsAmountTestId = 'asset-amount';

describe('Testing AssetActivityItem component', () => {
  const props: AssetActivityItemProps = {
    id: '1',
    fee: '3,40',
    type: 'outgoing',
    amount: '100',
    fiatAmount: '300 $',
    date: new Date('2021-01-01'),
    formattedDate: 'Date',
    formattedTimestamp: 'Timestamp',
    status: TransactionStatus.ERROR,
    onClick: jest.fn(),
    assetsNumber: 1,
    assets: [{ id: '1', val: '1', info: { ticker: 'testTicker' } }]
  };

  const assetActivityItemId = 'asset-activity-item';

  test('should render an asset activity item', async () => {
    const { findByTestId } = render(<AssetActivityItem {...props} />);
    const activityItem = await findByTestId(assetActivityItemId);

    const activityIcon = await findByTestId('asset-icon');
    const activityInfo = await findByTestId('asset-info');

    const activityAmount = await findByTestId(assetsAmountTestId);
    const activityAmountText = await within(activityAmount).findByText(props.amount);
    const activityFiatAmountText = await within(activityAmount).findByText(props.fiatAmount);
    const activityStatus = await findByTestId('activity-status');

    expect(activityItem).toBeVisible();
    expect(activityIcon).toBeVisible();
    expect(activityInfo).toBeVisible();
    expect(activityAmount).toBeVisible();
    expect(activityStatus).toBeVisible();

    expect(activityAmountText).toBeVisible();
    expect(activityFiatAmountText).toBeVisible();
  });

  test('should render an asset activity item with proper assets text when there is enough space to show assets info', async () => {
    const elWidth = 100;
    Object.defineProperties(window.HTMLElement.prototype, {
      offsetWidth: {
        get: () => elWidth
      }
    });
    const { findByTestId } = render(<AssetActivityItem {...props} />);

    const activityAmount = await findByTestId(assetsAmountTestId);
    const tickerText = `${props.amount}, ${props.assets[0].val} ${props.assets[0].info.ticker}`;
    const activityAssetTickerText = await within(activityAmount).findByText(tickerText);

    expect(activityAssetTickerText).toBeVisible();
  });

  test('should render an asset activity item with proper assets text when there is not enough space to show assets info', async () => {
    const elWidth = 10;
    Object.defineProperties(window.HTMLElement.prototype, {
      offsetWidth: {
        get: () => elWidth
      }
    });
    const { findByTestId } = render(<AssetActivityItem {...props} />);
    const tickerText = ', +1';
    const activityAmount = await findByTestId(assetsAmountTestId);
    const activityAssetTickerText = await within(activityAmount).findByText(tickerText);

    expect(activityAssetTickerText).toBeVisible();
  });

  test('should hide status when successful transaction', async () => {
    const { findByTestId } = render(<AssetActivityItem {...props} status={TransactionStatus.SUCCESS} />);
    const activityItem = await findByTestId(assetActivityItemId);
    expect(queryByTestId(activityItem, 'activity-status')).not.toBeInTheDocument();
  });

  test('should call the onClick function when clicking the item', async () => {
    const { findByTestId } = render(<AssetActivityItem {...props} />);
    const item = await findByTestId(assetActivityItemId);
    fireEvent.click(item);
    expect(props.onClick).toHaveBeenCalled();
  });

  test.todo('AssetActivityItem > test customIcon/type behaviour');
});
