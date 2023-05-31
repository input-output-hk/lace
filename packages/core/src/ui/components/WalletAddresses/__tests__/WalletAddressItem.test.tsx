import * as React from 'react';
import { render, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WalletAddressItem, WalletAddressItemProps } from '../WalletAddressItem';

describe('Testing WalletAddressItem component', () => {
  const props: WalletAddressItemProps = {
    id: 1,
    address:
      'addr_test1qrmavlv5c7za68rq6n6r0hrcqd604j9zsr6tycwtjf3lef0wc4p9nt0e0wwytcy30mxar65892w3k77e5g2uyhx29lhqjt267p',
    name: 'My Wallet',
    onClick: jest.fn()
  };

  test('should render a wallet address item', async () => {
    const elWidth = 300;
    // const originalOffsetWidth = window.HTMLElement.prototype.offsetWidth;
    Object.defineProperties(window.HTMLElement.prototype, {
      offsetWidth: {
        get: () => elWidth
      }
    });
    const { findByTestId } = render(<WalletAddressItem {...props} />);
    const walletItem = await findByTestId('address-list-item');

    const walletAvatar = await findByTestId('address-list-item-avatar');
    const avatarIcon = await within(walletItem).findByText(props.name.charAt(0).toLocaleUpperCase());

    const walletName = await findByTestId('address-list-item-name');
    const walletAddress = await findByTestId('address-list-item-address');
    const walletNameText = await within(walletName).findByText(props.name);
    const walletAddressText = await within(walletItem).findByText(props.address);

    expect(walletAvatar).toBeVisible();
    expect(avatarIcon).toBeVisible();
    expect(walletName).toBeVisible();
    expect(walletAddress).toBeVisible();
    expect(walletNameText).toBeVisible();
    expect(walletAddressText).toBeVisible();
  });

  test('should call the onClick function when clicking the item', async () => {
    const { findByTestId } = render(<WalletAddressItem {...props} />);
    const item = await findByTestId('address-list-item');

    fireEvent.click(item);
    expect(props.onClick).toHaveBeenCalled();
  });
});
