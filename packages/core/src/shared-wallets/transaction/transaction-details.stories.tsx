import { action } from '@storybook/addon-actions';
import { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { TransactionDetails, TransactionDetailsProps } from './TransactionDetails';

const meta: Meta<typeof TransactionDetails> = {
  component: TransactionDetails,
  title: 'Shared Wallets / Components / Transaction',
};

export default meta;

type Story = StoryObj<typeof TransactionDetails>;

const adaUSDPrice = 0.470_588;
const totalPercentages = 100;
const amountTransformer = (amount: number | string) =>
  `${Math.round(Number(amount) * adaUSDPrice * totalPercentages) / totalPercentages} USD`;

const props = {
  addressToNameMap: new Map(),
  amountTransformer,
  coinSymbol: 'ADA',
  cosigners: [
    {
      key: 'addr_shared4d854eebcf342990b2ff67f78a9ff3a69b877117e7075c379ecfe24b961c455b9af8ff630f633889a359c8caa3759a8c29f976fb02c81fcc1e9c249fc41951d3',
      name: 'Alice',
      signed: false,
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
  ],
  fee: '0.17',
  handleOpenExternalHashLink: action('handleOpenExternalHashLink'),
  isPopupView: false,
  ownSharedKey:
    'addr_shared4d854eebcf342990b2ff67f78a9ff3a69b877117e7075c379ecfe24b961c455b9af8ff630f633889a359c8caa3759a8c29f976fb02c81fcc1e9c249fc41951d3',
  signPolicy: {
    participants: 3,
    quorum: 2,
  },
  status: '',
  txInitiator:
    'addr_shared4d854eebcf342990b2ff67f78a9ff3a69b877117e7075c379ecfe24b961c455b9af8ff630f633889a359c8caa3759a8c29f976fb02c81fcc1e9c249fc41951d3',
  txSummary: [
    {
      addr: [
        'addr_test1qz93grfnssuxr00vyutc92tw6dgj4jxtnsxzvf2as04harx9v4sp0psum0jrw94ldemxr5v5v87wcmtsc57ckjg968cqlq4rsm',
      ],
      amount: '1000.00',
      assetList: [],
      type: 'outgoing',
    },
  ],
} as unknown as TransactionDetailsProps;

export const TransactionReviewPriorToSigning: Story = {
  render: () => <TransactionDetails {...props} />,
};

export const TransactionReviewPostSigning: Story = {
  render: () => (
    <TransactionDetails
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
        ] as unknown as TransactionDetailsProps['cosigners'],
        includedDate: '00/00/0000',
        includedTime: '00:00:00',
      }}
    />
  ),
};

export const CoSignerReviewPriorToSigning: Story = {
  render: () => (
    <TransactionDetails
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
        ] as unknown as TransactionDetailsProps['cosigners'],
        includedDate: '00/00/0000',
        includedTime: '00:00:00',
        ownSharedKey:
          'addr_shared4d854eebcf342990b2ff67f78a9ff3a69b877117e7075c379ecfe24b961c455b9af8ff630f633889a359c8caa3759a8c29f976fb02c81fcc1e9c249fc41951d2' as unknown as TransactionDetailsProps['ownSharedKey'],
      }}
    />
  ),
};

export const CoSignerReviewPostSigning: Story = {
  render: () => (
    <TransactionDetails
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
        ] as unknown as TransactionDetailsProps['cosigners'],
        includedDate: '00/00/0000',
        includedTime: '00:00:00',
        ownSharedKey:
          'addr_shared4d854eebcf342990b2ff67f78a9ff3a69b877117e7075c379ecfe24b961c455b9af8ff630f633889a359c8caa3759a8c29f976fb02c81fcc1e9c249fc41951d2' as unknown as TransactionDetailsProps['ownSharedKey'],
      }}
    />
  ),
};

export const PostSubmission: Story = {
  render: () => (
    <TransactionDetails
      {...{
        ...props,
        cosigners: [
          {
            key: 'addr_shared4d854eebcf342990b2ff67f78a9ff3a69b877117e7075c379ecfe24b961c455b9af8ff630f633889a359c8caa3759a8c29f976fb02c81fcc1e9c249fc41951d3',
            name: 'Alice',
            signed: true,
          },
          {
            key: 'addr_shared4d854eebcf342990b2ff67f78a9ff3a69b877117e7075c379ecfe24b961c455b9af8ff630f633889a359c8caa3759a8c29f976fb02c81fcc1e9c249fc41951d3',
            name: 'Bob',
            signed: true,
          },
          {
            key: 'addr_shared4d854eebcf342990b2ff67f78a9ff3a69b877117e7075c379ecfe24b961c455b9af8ff630f633889a359c8caa3759a8c29f976fb02c81fcc1e9c249fc41951d3',
            name: 'Charlie',
            signed: false,
          },
        ] as unknown as TransactionDetailsProps['cosigners'],
        hash: 'cc982d3e41812951cfa5007614f1da87bce5fa1fc70708ad538df73a5a130f20',
        includedDate: '00/00/0000',
        includedTime: '00:00:00',
      }}
    />
  ),
};
