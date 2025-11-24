/* eslint-disable no-magic-numbers */
import * as React from 'react';
import { render, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WalletBasicInfo, WalletBasicInfoProps } from '../WalletBasicInfo';
import { addEllipsis } from '@lace/common';

describe('Testing WalletBasicInfo component', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  const props: WalletBasicInfoProps = {
    walletAddress:
      'addr_test1qrmavlv5c7za68rq6n6r0hrcqd604j9zsr6tycwtjf3lef0wc4p9nt0e0wwytcy30mxar65892w3k77e5g2uyhx29lhqjt267p',
    walletName: 'My Wallet',
    handleClick: jest.fn(),
    balance: '10000 ₳',
    translations: {
      balance: 'Balance'
    }
  };
  test('should render component', async () => {
    const { findByTestId, getByText } = render(<WalletBasicInfo {...props} />);
    const walletAvatar = await findByTestId('wallet-avatar');
    const avatarIcon = await within(walletAvatar).findByText('M');
    const walletName = await within(walletAvatar).findByRole('heading');

    const balanceContainer = await findByTestId('basic-info-balance');
    const balanceLabel = await within(balanceContainer).findByTestId('balance');

    expect(avatarIcon).toBeVisible();
    expect(walletName).toBeVisible();
    expect(walletName).toHaveTextContent(props.walletName);
    expect(getByText(addEllipsis(props.walletAddress, 5, 5))).toBeInTheDocument();
    expect(walletAvatar).toBeVisible();
    expect(walletAvatar).toBeEnabled();
    expect(balanceLabel).toHaveTextContent(props.balance);
  });
});
