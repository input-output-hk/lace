import type { Meta, StoryObj } from '@storybook/react';

import { DappTransaction } from './DappTransaction';
import { ComponentProps } from 'react';
import { Wallet } from '@lace/cardano';
import { AssetInfoWithAmount, TokenTransferValue } from '@cardano-sdk/core';

const meta: Meta<typeof DappTransaction> = {
  title: 'DappTransaction',
  component: DappTransaction,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof DappTransaction>;

const fromAddress = Wallet.Cardano.PaymentAddress(
  'addr_test1qq585l3hyxgj3nas2v3xymd23vvartfhceme6gv98aaeg9muzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q2g7k3g'
);

const toAddress = Wallet.Cardano.PaymentAddress(
  'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz'
);

const toAddressBookAddress = Wallet.Cardano.PaymentAddress(
  'addr_test1qzqgfww9svrzelxrnlml0nmdq4yevwke7ck7ae27u5ptmq5dwuq25p4hr0yxhg4pce0d6t7v4c0msy3vr3xppygn9ktqe77950'
);

const PXLAssetId = Wallet.Cardano.AssetId('1ec85dcee27f2d90ec1f9a1e4ce74a667dc9be8b184463223f9c960150584c');
const PXLPolicyId = Wallet.Cardano.AssetId.getPolicyId(PXLAssetId);
const PXLAssetName = Wallet.Cardano.AssetId.getAssetName(PXLAssetId);
const PXLAssetInfo: AssetInfoWithAmount = {
  // eslint-disable-next-line no-magic-numbers
  amount: BigInt(100_000),
  assetInfo: {
    assetId: PXLAssetId,
    name: PXLAssetName,
    policyId: PXLPolicyId,
    fingerprint: Wallet.Cardano.AssetFingerprint.fromParts(PXLPolicyId, PXLAssetName),
    // eslint-disable-next-line no-magic-numbers
    supply: BigInt(11_242_452_000),
    quantity: BigInt(1)
  }
};

const fromAddressTokens: TokenTransferValue = {
  // eslint-disable-next-line no-magic-numbers
  coins: BigInt(-100_000),
  assets: new Map([[PXLAssetId, { ...PXLAssetInfo, amount: -PXLAssetInfo.amount }]])
};

const toAddressTokens: TokenTransferValue = {
  // eslint-disable-next-line no-magic-numbers
  coins: BigInt(100_000),
  assets: new Map([[PXLAssetId, PXLAssetInfo]])
};

const data: ComponentProps<typeof DappTransaction> = {
  dappInfo: {
    name: 'Mint'
  },
  coinSymbol: 'tAda',
  fiatCurrencyCode: 'usd',
  ownAddresses: [fromAddress],
  addressToNameMap: new Map([[toAddressBookAddress, 'test']]),
  fromAddress: new Map([[fromAddress, fromAddressTokens]]),
  toAddress: new Map([
    [toAddress, toAddressTokens],
    [toAddressBookAddress, toAddressTokens]
  ]),
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
