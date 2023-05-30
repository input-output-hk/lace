/* eslint-disable no-magic-numbers */
import * as React from 'react';
import { render, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WalletAvatar, WalletAvatarProps } from '../WalletAvatar';
import { addEllipsis } from '@lace/common';

describe('Testing WalletAvatar component', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  const props: WalletAvatarProps = {
    walletAddress:
      'addr_test1qrmavlv5c7za68rq6n6r0hrcqd604j9zsr6tycwtjf3lef0wc4p9nt0e0wwytcy30mxar65892w3k77e5g2uyhx29lhqjt267p',
    walletName: 'My Wallet',
    handleClick: jest.fn()
  };
  test('should render component and be clickable', async () => {
    const { findByTestId, getByText } = render(<WalletAvatar {...props} />);
    const walletAvatar = await findByTestId('wallet-avatar');
    const avatarIcon = await within(walletAvatar).findByText('M');
    const walletName = await within(walletAvatar).findByRole('heading');

    expect(avatarIcon).toBeVisible();
    expect(walletName).toBeVisible();
    expect(walletName).toHaveTextContent(props.walletName);
    expect(getByText(addEllipsis(props.walletAddress, 5, 5))).toBeInTheDocument();
    expect(walletAvatar).toBeVisible();
    expect(walletAvatar).toBeEnabled();
  });
  test('should call the handleClick function when clicked', async () => {
    const { findByTestId } = render(<WalletAvatar {...props} />);
    const walletAvatar = await findByTestId('wallet-avatar');

    fireEvent.click(walletAvatar);
    expect(props.handleClick).toHaveBeenCalled();
  });

  test('should have full address', async () => {
    const { getByText } = render(<WalletAvatar {...props} withoutEllipsis />);
    expect(getByText(props.walletAddress)).toBeInTheDocument();
  });
});
