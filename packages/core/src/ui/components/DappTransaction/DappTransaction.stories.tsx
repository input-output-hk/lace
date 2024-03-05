import type { Meta, StoryObj } from '@storybook/react';

import { DappTransaction } from './DappTransaction';
import { ComponentProps } from 'react';
import { Wallet } from '@lace/cardano';

const meta: Meta<typeof DappTransaction> = {
  title: 'DappTransaction',
  component: DappTransaction,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof DappTransaction>;

const data: ComponentProps<typeof DappTransaction> = {
  dappInfo: {
    name: 'Mint'
  },
  coinSymbol: 'tAda',
  fiatCurrencyCode: 'usd',
  fromAddress: new Map(),
  toAddress: new Map(),
  // eslint-disable-next-line no-magic-numbers
  collateral: 150_000 as unknown as bigint,
  txInspectionDetails: {
    assets: new Map(),
    // eslint-disable-next-line no-magic-numbers
    coins: 1_171_000 as unknown as bigint,
    // eslint-disable-next-line no-magic-numbers
    collateral: 150_000 as unknown as bigint,
    // eslint-disable-next-line no-magic-numbers
    deposit: 1_000_000 as unknown as bigint,
    // eslint-disable-next-line no-magic-numbers
    fee: 170_000 as unknown as bigint,
    // eslint-disable-next-line no-magic-numbers
    returnedDeposit: 90_000 as unknown as bigint,

    unresolved: {
      inputs: [
        {
          index: 0,
          txId: Wallet.Cardano.TransactionId('bb217abaca60fc0ca68c1555eca6a96d2478547818ae76ce6836133f3cc546e0')
        }
      ],
      value: {
        assets: new Map([
          [
            Wallet.Cardano.AssetId('6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7'),
            // eslint-disable-next-line no-magic-numbers
            4 as unknown as bigint
          ],
          [
            Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41'),
            // eslint-disable-next-line no-magic-numbers
            7 as unknown as bigint
          ]
        ]),

        // eslint-disable-next-line no-magic-numbers
        coins: 11_171_000 as unknown as bigint
      }
    }
  }
};

export const Overview: Story = {
  args: {
    ...data
  }
};

export const WithInsufficientFunds: Story = {
  args: {
    ...data
  }
};

export const WithError: Story = {
  args: {
    ...data,
    errorMessage: 'Something went wrong'
  }
};
