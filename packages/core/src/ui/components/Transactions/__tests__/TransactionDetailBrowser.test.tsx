/* eslint-disable no-magic-numbers */
import * as React from 'react';
import { render, within, fireEvent } from '@testing-library/react';
import { TransactionDetailBrowser, TransactionDetailBrowserProps } from '../TransactionDetailBrowser';
import '@testing-library/jest-dom';

const transactionDate = '2021/09/10';

describe('Testing TransactionDetailsBrowser component', () => {
  const addrListProps: TransactionDetailBrowserProps = {
    isPopupView: false,
    hash: '5e58ad7aa10667c05c3ffdb9ae65fe22c77e5145db823715217b775b4344839f',
    totalOutput: '38038.963341 ADA',
    fee: '0.168449 ADA',
    includedDate: transactionDate,
    includedTime: '13:47:41 UTC',
    assets: [
      {
        title: 'Cardano',
        subtitle: '(ADA)'
      }
    ],
    addrInputs: [
      {
        addr: 'addr1q8n25fdyxapl72t4gscwp2smkad5c4zhmaxvx22h8jna6zd7clusal8488efyej3x2jwr2zn9ufxy8szd92nhshffpdq9lkl8z',
        amount: '40.05 ADA'
      }
    ],
    addrOutputs: [
      {
        addr: 'addr1q8n25fdyxapl72t4gscwp2smkad5c4zhmaxvx22h8jna6zd7clusal8488efyej3x2jwr2zn9ufxy8szd92nhshffpdq9lkl8z',
        amount: '40.05 ADA'
      }
    ],
    amountTransformer: (amount) => `${amount} $`,
    coinSymbol: 'ADA',
    type: 'incoming',
    addressToNameMap: new Map()
  };

  test('should display transaction hash and copy button', async () => {
    const { findByTestId } = render(<TransactionDetailBrowser {...addrListProps} />);

    const container = await findByTestId('tx-hash');
    expect(container).toBeVisible();
  });

  test('should display transaction date and time', async () => {
    const { findByTestId } = render(<TransactionDetailBrowser {...addrListProps} />);

    const dateContainer = await findByTestId('tx-date');
    expect(dateContainer).toBeVisible();
  });

  test('should display transaction inputs and outputs list', async () => {
    const { findByTestId } = render(<TransactionDetailBrowser {...addrListProps} addrOutputs={[]} />);

    const inputContainer = await findByTestId('tx-inputs');
    const listToggle = await findByTestId('tx-addr-list_toggle');
    fireEvent.click(listToggle);

    const inputs = await within(inputContainer).findByTestId('tx-addr-list');

    expect(inputs).toBeInTheDocument();
  });

  test('should display transaction and fee', async () => {
    const { findByTestId } = render(<TransactionDetailBrowser {...addrListProps} />);

    const feeContainer = await findByTestId('tx-fee');
    expect(feeContainer).toBeVisible();
  });

  test('should display transaction metadata if available', async () => {
    const { findByTestId } = render(
      <TransactionDetailBrowser {...addrListProps} metadata={[{ key: '1', value: [{ msg: 'Metadata' }] }]} />
    );
    const txMetadata = await findByTestId('tx-metadata');
    expect(txMetadata).toBeVisible();
  });

  test('should not display transaction metadata if not available', async () => {
    const { queryByTestId: query } = render(<TransactionDetailBrowser {...addrListProps} />);
    expect(query('tx-metadata')).not.toBeInTheDocument();
  });
});
