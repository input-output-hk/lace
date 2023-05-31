/* eslint-disable sonarjs/no-duplicate-string */
import * as React from 'react';
import { render, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { InfoWallet, InfoWalletProps } from '../InfoWallet';

describe('Testing InfoWallet component', () => {
  const props: InfoWalletProps = {
    walletInfo: {
      name: 'Test Wallet',
      qrData:
        'addr_test1qrmavlv5c7za68rq6n6r0hrcqd604j9zsr6tycwtjf3lef0wc4p9nt0e0wwytcy30mxar65892w3k77e5g2uyhx29lhqjt267p'
    },
    translations: {
      copy: 'Copy',
      copiedMessage: 'Address copied'
    }
  };

  test('should display wallet information and qr code', async () => {
    const { findByTestId } = render(<InfoWallet {...props} />);
    const infoWalletContainer = await findByTestId('info-wallet');
    const qrCodeContainer = await findByTestId('qr-code-container');

    expect(within(infoWalletContainer).queryByText(props.walletInfo.qrData)).toBeInTheDocument();
    expect(within(infoWalletContainer).queryByText(props.walletInfo.name)).toBeInTheDocument();
    expect(within(qrCodeContainer).queryByTestId('qr-code')).toBeInTheDocument();
  });
});
