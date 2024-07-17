/* eslint-disable no-magic-numbers */
import * as React from 'react';
import { render, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TransactionDetails } from '../TransactionDetails';
import { Wallet } from '@lace/cardano';
import { TransactionDetailsProps } from '../../Transaction';

const transactionDate = '2021/09/10';

export const cardanoCoin: Wallet.CoinId = {
  id: '1',
  name: 'Cardano',
  decimals: 6,
  symbol: 'A'
};

describe('Testing ActivityDetailsBrowser component', () => {
  const addrListProps: TransactionDetailsProps = {
    name: 'Name',
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
    ownAddresses: [],
    addressToNameMap: new Map(),
    chainNetworkId: Wallet.Cardano.NetworkId.Testnet,
    cardanoCoin,
    explorerBaseUrl: ''
  };

  test('should display transaction hash and copy button', async () => {
    const { findByTestId } = render(<TransactionDetails {...addrListProps} />);

    const container = await findByTestId('tx-hash');
    expect(container).toBeVisible();
  });

  test('should display transaction date and time', async () => {
    const { findByTestId } = render(<TransactionDetails {...addrListProps} />);

    const dateContainer = await findByTestId('tx-date');
    expect(dateContainer).toBeVisible();
  });

  test('should display transaction inputs and outputs list', async () => {
    const { findByTestId } = render(<TransactionDetails {...addrListProps} addrOutputs={[]} />);

    const inputContainer = await findByTestId('tx-inputs');
    const listToggle = await findByTestId('tx-addr-list_toggle');
    fireEvent.click(listToggle);

    const inputs = await within(inputContainer).findByTestId('tx-addr-list');

    expect(inputs).toBeInTheDocument();
  });

  test('should display transaction and fee', async () => {
    const { findByTestId } = render(<TransactionDetails {...addrListProps} />);

    const feeContainer = await findByTestId('tx-fee');
    expect(feeContainer).toBeVisible();
  });

  test('should display transaction metadata if available', async () => {
    const { findByTestId } = render(
      <TransactionDetails {...addrListProps} metadata={[{ key: '1', value: [{ msg: 'Metadata' }] }]} />
    );
    const txMetadata = await findByTestId('tx-metadata');
    expect(txMetadata).toBeVisible();
  });

  test('should not display transaction metadata if not available', async () => {
    const { queryByTestId: query } = render(<TransactionDetails {...addrListProps} />);
    expect(query('tx-metadata')).not.toBeInTheDocument();
  });

  test('should show address tag for inputs', async () => {
    // use empty addrOutputs (so we get only one toggle button for inputs)
    const { findByTestId } = render(<TransactionDetails {...addrListProps} addrOutputs={[]} />);
    const inputsSectionToggle = await findByTestId('tx-addr-list_toggle');
    fireEvent.click(inputsSectionToggle);

    expect(await findByTestId('address-tag')).toBeVisible();
  });

  test('should show address tag for outputs', async () => {
    // use empty addrOutputs (so we get only one toggle button for outputs)
    const { findByTestId } = render(<TransactionDetails {...addrListProps} addrOutputs={[]} />);
    const outputsSectionToggle = await findByTestId('tx-addr-list_toggle');
    fireEvent.click(outputsSectionToggle);

    expect(await findByTestId('address-tag')).toBeVisible();
  });
});
