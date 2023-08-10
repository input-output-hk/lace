/* eslint-disable no-magic-numbers */
import * as React from 'react';
import { render, within, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WalletAddressList, WalletAddressListProps } from '../WalletAddressList';

const addressListTestId = 'address-list';
const addressListContainerTestId = 'scrollableTargetId';
const address =
  'addr_test1qrmavlv5c7za68rq6n6r0hrcqd604j9zsr6tycwtjf3lef0wc4p9nt0e0wwytcy30mxar65892w3k77e5g2uyhx29lhqjt267p';

describe('Testing WalletAddressList component', () => {
  const total = 10;
  const props: WalletAddressListProps = {
    items: Array.from({ length: total }, (_iem, indx) => ({
      id: indx,
      address,
      name: 'My Wallet',
      onClick: jest.fn(),
      isSmall: true
    })),
    loadMoreData: jest.fn(),
    total,
    scrollableTargetId: addressListContainerTestId,
    translations: {
      name: 'Name',
      address: 'addr_tes...67p'
    }
  };
  test('should render a list of 10 complete addresses', async () => {
    const { findByTestId } = render(
      <div
        data-testid={addressListContainerTestId}
        id={addressListContainerTestId}
        style={{ height: '1000px', overflow: 'auto' }}
      >
        <WalletAddressList {...props} />
      </div>
    );
    const list = await findByTestId(addressListTestId);
    const items = await within(list).findAllByTestId('address-list-item');
    const addresses = await within(list).findAllByTestId('address-list-item-address');

    expect(items).toHaveLength(10);
    expect(addresses).toHaveLength(10);
  });

  test('should display an empty list message', async () => {
    const { findByTestId, queryAllByText } = render(
      <div
        data-testid={addressListContainerTestId}
        id={addressListContainerTestId}
        style={{ height: '1000px', overflow: 'auto' }}
      >
        <WalletAddressList {...props} items={[]} total={0} emptyText={'no items'} />
      </div>
    );
    const list = await findByTestId(addressListTestId);

    const message = await within(list).findByText(/no items/i);
    await waitFor(() => {
      expect(queryAllByText(address)).toHaveLength(0);
    });
    expect(message).toBeVisible();
  });

  test('should not execute loadMoreData when scrolling if thee are no more items', async () => {
    const { findByTestId } = render(
      <div
        data-testid={addressListContainerTestId}
        id={addressListContainerTestId}
        style={{ height: '1000px', overflow: 'auto' }}
      >
        <WalletAddressList {...props} />
      </div>
    );
    const list = await findByTestId(addressListContainerTestId);

    fireEvent.scroll(list, { target: { scrollY: 3000 } });

    expect(props.loadMoreData).not.toHaveBeenCalled();
  });

  test('should execute loadMoreData when scrolling if there are more items', async () => {
    const { findByTestId } = render(
      <div
        data-testid={addressListContainerTestId}
        id={addressListContainerTestId}
        style={{ height: '500px', overflow: 'auto' }}
      >
        <WalletAddressList {...props} total={total + 1} />
      </div>
    );
    const list = await findByTestId(addressListContainerTestId);

    fireEvent.scroll(list, { target: { scrollY: 3000 } });

    expect(props.loadMoreData).toHaveBeenCalled();
  });
});
