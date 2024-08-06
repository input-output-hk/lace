import { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { OutputSummaryProps } from '../../ui/components/OutputSummary';
import { ActivityStatus } from '../../ui/components/Transaction';
import { SharedWalletTransactionDetails, SharedWalletTransactionDetailsProps } from './SharedWalletTransactionDetails';

const meta: Meta<typeof SharedWalletTransactionDetails> = {
  component: SharedWalletTransactionDetails,
  title: 'Shared Wallets / Components / Transaction',
};

export default meta;

type Story = StoryObj<typeof SharedWalletTransactionDetails>;

const adaUSDPrice = 0.470_588;
const totalPercentages = 100;
const amountTransformer = (amount: number | string) =>
  `${Math.round(Number(amount) * adaUSDPrice * totalPercentages) / totalPercentages} USD`;

const signPolicy = {
  requiredCosigners: 3,
  signers: [
    {
      keyHash: 'fe96407398fdb928d5aad19b60dbd0392c6fb04ad0f684dfd0819f4f',
      name: 'Alice',
    },
    {
      keyHash: 'b7141119dca66ecd82b6984cff6aadd6a70750562efc32153add4f16',
      name: 'Bob',
    },
    {
      keyHash: '4ff542dcc10bbe413b827a29255b1d8aacbff1d8074de00cf7d039c7',
      name: 'Charlie',
    },
  ],
};

const props = {
  amountTransformer,
  coinSymbol: 'ADA',
  cosigners: [
    {
      name: 'Alice',
      sharedWalletKey:
        'addr_shared4d854eebcf342990b2ff67f78a9ff3a69b877117e7075c379ecfe24b961c455b9af8ff630f633889a359c8caa3759a8c29f976fb02c81fcc1e9c249fc41951d3',
      signed: false,
    },
    {
      name: 'Bob',
      sharedWalletKey:
        'addr_shared4d854eebcf342990b2ff67f78a9ff3a69b877117e7075c379ecfe24b961c455b9af8ff630f633889a359c8caa3759a8c29f976fb02c81fcc1e9c249fc41951d2',
      signed: false,
    },
    {
      name: 'Charlie',
      sharedWalletKey:
        'addr_shared4d854eebcf342990b2ff67f78a9ff3a69b877117e7075c379ecfe24b961c455b9af8ff630f633889a359c8caa3759a8c29f976fb02c81fcc1e9c249fc41951d1',
      signed: false,
    },
  ],
  fee: '0.17',
  ownSharedKey:
    'addr_shared4d854eebcf342990b2ff67f78a9ff3a69b877117e7075c379ecfe24b961c455b9af8ff630f633889a359c8caa3759a8c29f976fb02c81fcc1e9c249fc41951d3',
  rows: [
    {
      list: [
        {
          assetAmount: '10.00 tADA',
          fiatAmount: '4.46 USD',
        },
      ],
      recipientAddress:
        'addr_test1qphhr294v0w0rzgk7kz4ynsp8hwt82ha6nsp8yk6h04fhzsuryus5g7pm3lq85msee5pdtqlnv2crdc83kk2tvhsefcsu2snle',
      recipientName: 'main',
    },
  ],
  signPolicy,
  status: ActivityStatus.AWAITING_COSIGNATURES,
  txInitiator:
    'addr_shared4d854eebcf342990b2ff67f78a9ff3a69b877117e7075c379ecfe24b961c455b9af8ff630f633889a359c8caa3759a8c29f976fb02c81fcc1e9c249fc41951d3',
} as unknown as SharedWalletTransactionDetailsProps;

const moreOutputRows: OutputSummaryProps = {
  list: [
    {
      assetAmount: '12.00 tADA',
      fiatAmount: '5.46 USD',
    },
    {
      assetAmount: '10 MDEX3',
      fiatAmount: '-',
    },
    {
      assetAmount: '20 USDC',
      fiatAmount: '-',
    },
  ],
  recipientAddress:
    'addr_test1qphhr294v0w0rzgk7kz4ynsp8hwt82ha6nsp8yk6h04fhzsuryus5g7pm3lq85msee5pdtqlnv2crdc83kk2tvhsefcsu2snle',
};

export const TransactionReviewPriorToSigning: Story = {
  render: () => <SharedWalletTransactionDetails {...props} />,
};

export const BundleTransactionReviewPriorToSigning: Story = {
  render: () => <SharedWalletTransactionDetails {...props} rows={[...props.rows, moreOutputRows]} />,
};

export const TransactionReviewPostSigning: Story = {
  render: () => (
    <SharedWalletTransactionDetails
      {...{
        ...props,
        cosigners: [
          {
            name: 'Alice',
            sharedWalletKey:
              'addr_shared4d854eebcf342990b2ff67f78a9ff3a69b877117e7075c379ecfe24b961c455b9af8ff630f633889a359c8caa3759a8c29f976fb02c81fcc1e9c249fc41951d3',
            signed: true,
          },
          {
            name: 'Bob',
            sharedWalletKey:
              'addr_shared4d854eebcf342990b2ff67f78a9ff3a69b877117e7075c379ecfe24b961c455b9af8ff630f633889a359c8caa3759a8c29f976fb02c81fcc1e9c249fc41951d2',
            signed: false,
          },
          {
            name: 'Charlie',
            sharedWalletKey:
              'addr_shared4d854eebcf342990b2ff67f78a9ff3a69b877117e7075c379ecfe24b961c455b9af8ff630f633889a359c8caa3759a8c29f976fb02c81fcc1e9c249fc41951d1',
            signed: false,
          },
        ] as unknown as SharedWalletTransactionDetailsProps['cosigners'],
      }}
    />
  ),
};

export const CoSignerReviewPriorToSigning: Story = {
  render: () => (
    <SharedWalletTransactionDetails
      {...{
        ...props,
        cosigners: [
          {
            key: 'addr_shared4d854eebcf342990b2ff67f78a9ff3a69b877117e7075c379ecfe24b961c455b9af8ff630f633889a359c8caa3759a8c29f976fb02c81fcc1e9c249fc41951d3',
            name: 'Alice',
            signed: true,
          },
          {
            key: 'addr_shared4d854eebcf342990b2ff67f78a9ff3a69b877117e7075c379ecfe24b961c455b9af8ff630f633889a359c8caa3759a8c29f976fb02c81fcc1e9c249fc41951d2',
            name: 'Bob',
            signed: false,
          },
          {
            key: 'addr_shared4d854eebcf342990b2ff67f78a9ff3a69b877117e7075c379ecfe24b961c455b9af8ff630f633889a359c8caa3759a8c29f976fb02c81fcc1e9c249fc41951d1',
            name: 'Charlie',
            signed: false,
          },
        ] as unknown as SharedWalletTransactionDetailsProps['cosigners'],
        ownSharedKey:
          'addr_shared4d854eebcf342990b2ff67f78a9ff3a69b877117e7075c379ecfe24b961c455b9af8ff630f633889a359c8caa3759a8c29f976fb02c81fcc1e9c249fc41951d2' as unknown as SharedWalletTransactionDetailsProps['ownSharedKey'],
      }}
    />
  ),
};

export const CoSignerReviewPostSigning: Story = {
  render: () => (
    <SharedWalletTransactionDetails
      {...{
        ...props,
        cosigners: [
          {
            key: 'addr_shared4d854eebcf342990b2ff67f78a9ff3a69b877117e7075c379ecfe24b961c455b9af8ff630f633889a359c8caa3759a8c29f976fb02c81fcc1e9c249fc41951d3',
            name: 'Alice',
            signed: true,
          },
          {
            key: 'addr_shared4d854eebcf342990b2ff67f78a9ff3a69b877117e7075c379ecfe24b961c455b9af8ff630f633889a359c8caa3759a8c29f976fb02c81fcc1e9c249fc41951d2',
            name: 'Bob',
            signed: true,
          },
          {
            key: 'addr_shared4d854eebcf342990b2ff67f78a9ff3a69b877117e7075c379ecfe24b961c455b9af8ff630f633889a359c8caa3759a8c29f976fb02c81fcc1e9c249fc41951d1',
            name: 'Charlie',
            signed: false,
          },
        ] as unknown as SharedWalletTransactionDetailsProps['cosigners'],
        ownSharedKey:
          'addr_shared4d854eebcf342990b2ff67f78a9ff3a69b877117e7075c379ecfe24b961c455b9af8ff630f633889a359c8caa3759a8c29f976fb02c81fcc1e9c249fc41951d2' as unknown as SharedWalletTransactionDetailsProps['ownSharedKey'],
      }}
    />
  ),
};

export const PostSubmission: Story = {
  render: () => (
    <SharedWalletTransactionDetails
      {...{
        ...props,
        cosigners: [
          {
            name: 'Alice',
            sharedWalletKey:
              'addr_shared4d854eebcf342990b2ff67f78a9ff3a69b877117e7075c379ecfe24b961c455b9af8ff630f633889a359c8caa3759a8c29f976fb02c81fcc1e9c249fc41951d3',
            signed: true,
          },
          {
            name: 'Bob',
            sharedWalletKey:
              'addr_shared4d854eebcf342990b2ff67f78a9ff3a69b877117e7075c379ecfe24b961c455b9af8ff630f633889a359c8caa3759a8c29f976fb02c81fcc1e9c249fc41951d3',
            signed: true,
          },
          {
            name: 'Charlie',
            sharedWalletKey:
              'addr_shared4d854eebcf342990b2ff67f78a9ff3a69b877117e7075c379ecfe24b961c455b9af8ff630f633889a359c8caa3759a8c29f976fb02c81fcc1e9c249fc41951d3',
            signed: false,
          },
        ] as unknown as SharedWalletTransactionDetailsProps['cosigners'],
      }}
    />
  ),
};
