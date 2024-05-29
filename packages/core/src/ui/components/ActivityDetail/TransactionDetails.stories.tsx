/* eslint-disable no-console */
/* eslint-disable sonarjs/no-duplicate-string */
import type { Meta, StoryObj } from '@storybook/react';

import { TransactionDetails } from './TransactionDetails';
import { ComponentProps } from 'react';
import { ActivityStatus } from '../Activity/AssetActivityItem';
import { Wallet } from '@lace/cardano';
import { mockProposalProcedure } from '@src/ui/utils';
import { mockVotingProcedures } from '@src/ui/utils/voting-procedures-mock';
const { Cardano, Crypto } = Wallet;
const REWARD_ACCOUNT = Cardano.RewardAccount('stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj');
const STAKE_KEY_HASH = Cardano.RewardAccount.toHash(REWARD_ACCOUNT);

// Storybook doesn't support parameters with BigInt
const DUMMY_DEPOSIT = '100000' as never as bigint;
const KEY_HASH_CREDENTIAL = {
  type: Cardano.CredentialType.KeyHash,
  hash: Crypto.Hash28ByteBase16(STAKE_KEY_HASH)
};

const meta: Meta<typeof TransactionDetails> = {
  title: 'Sanchonet/ActivityDetail/TransactionDetails',
  component: TransactionDetails,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof TransactionDetails>;

const adaPrice = 0.470_588_235_294_117_6;

const data: ComponentProps<typeof TransactionDetails> = {
  hash: '639a43144dc2c0ead16f2fb753360f4b4f536502dbdb8aa5e424b00abb7534ff',
  name: 'Stake Vote Delegation Certificate',
  status: ActivityStatus.SUCCESS,
  includedDate: '00/00/0000',
  includedTime: '00:00:00',
  fee: '0.17',
  addrInputs: [
    {
      amount: '9975.13',
      assetList: [],
      addr: 'addr_test1qqwhys44c506gsyqnwx3cy6nrhmalajfanqsg0ult5aj4pg8unnmf7l2w7pwz6nej0qj463w7mpytey22ag0h64fs5gs8zw2jg'
    }
  ],
  addrOutputs: [
    {
      amount: '1.00',
      assetList: [],
      addr: 'addr_test1qqwhys44c506gsyqnwx3cy6nrhmalajfanqsg0ult5aj4pg8unnmf7l2w7pwz6nej0qj463w7mpytey22ag0h64fs5gs8zw2jg'
    },
    {
      amount: '9971.96',
      assetList: [],
      addr: 'addr_test1qqwhys44c506gsyqnwx3cy6nrhmalajfanqsg0ult5aj4pg8unnmf7l2w7pwz6nej0qj463w7mpytey22ag0h64fs5gs8zw2jg'
    }
  ],
  txSummary: [],
  coinSymbol: 'ADA',
  addressToNameMap: new Map(),
  isPopupView: false,
  votingProcedures: [],
  amountTransformer: (amount) => `${Number(amount) * adaPrice} USD`,
  handleOpenExternalHashLink: () => {
    console.log('handle on hash click', '639a43144dc2c0ead16f2fb753360f4b4f536502dbdb8aa5e424b00abb7534ff');
  },
  chainNetworkId: 0,
  cardanoCoin: {
    id: '1',
    name: 'Cardano',
    decimals: 6,
    symbol: 'tADA'
  },
  explorerBaseUrl: 'some-test-url',
  ownAddresses: []
};

const stakeVoteDelegationCertificate: Wallet.Cardano.StakeVoteDelegationCertificate = {
  __typename: Cardano.CertificateType.StakeVoteDelegation,
  poolId: Cardano.PoolId('pool126zlx7728y7xs08s8epg9qp393kyafy9rzr89g4qkvv4cv93zem'),
  stakeCredential: KEY_HASH_CREDENTIAL,
  dRep: KEY_HASH_CREDENTIAL
};

export const StakeVoteDelegationCertificate: Story = {
  args: {
    ...data,
    certificates: [stakeVoteDelegationCertificate]
  }
};

export const StakeVoteDelegationCertificates: Story = {
  args: {
    ...data,
    certificates: [stakeVoteDelegationCertificate, stakeVoteDelegationCertificate]
  }
};

const stakeRegistrationDelegationCertificate: Wallet.Cardano.StakeRegistrationDelegationCertificate = {
  __typename: Cardano.CertificateType.StakeRegistrationDelegation,
  deposit: DUMMY_DEPOSIT,
  poolId: Cardano.PoolId('pool1syqhydhdzcuqhwtt6q4m63f9g8e7262wzsvk7e0r0njsyjyd0yn'),
  stakeCredential: KEY_HASH_CREDENTIAL
};

export const StakeRegistrationDelegationCertificate: Story = {
  args: {
    ...data,
    name: 'Stake Registration Delegation Certificate',
    certificates: [stakeRegistrationDelegationCertificate]
  }
};

const voteRegistrationDelegationCertificate: Wallet.Cardano.VoteRegistrationDelegationCertificate = {
  __typename: Cardano.CertificateType.VoteRegistrationDelegation,
  stakeCredential: KEY_HASH_CREDENTIAL,
  dRep: KEY_HASH_CREDENTIAL,
  deposit: DUMMY_DEPOSIT
};

export const VoteRegistrationDelegationCertificate: Story = {
  args: {
    ...data,
    name: 'Vote Registration Delegation Certificate',
    certificates: [voteRegistrationDelegationCertificate]
  }
};

const stakeVoteRegistrationDelegationCertificate: Wallet.Cardano.StakeVoteRegistrationDelegationCertificate = {
  __typename: Cardano.CertificateType.StakeVoteRegistrationDelegation,
  poolId: Cardano.PoolId('pool126zlx7728y7xs08s8epg9qp393kyafy9rzr89g4qkvv4cv93zem'),
  stakeCredential: KEY_HASH_CREDENTIAL,
  dRep: KEY_HASH_CREDENTIAL,
  deposit: DUMMY_DEPOSIT
};

export const StakeVoteRegistrationDelegationCertificate: Story = {
  args: {
    ...data,
    name: 'Stake Vote Registration Delegation Certificate',
    certificates: [stakeVoteRegistrationDelegationCertificate]
  }
};

const updateDRep: Wallet.Cardano.UpdateDelegateRepresentativeCertificate = {
  __typename: Cardano.CertificateType.UpdateDelegateRepresentative,
  dRepCredential: KEY_HASH_CREDENTIAL,
  anchor: {
    url: 'anchorUrl',
    dataHash: Crypto.Hash32ByteBase16(Buffer.from('anchorDataHashanchorDataHashanch').toString('hex'))
  }
};

export const UpdateDRep: Story = {
  name: 'Update DRep',
  args: {
    ...data,
    name: 'Update DRep',
    certificates: [updateDRep]
  }
};

const resignCommittee: Wallet.Cardano.ResignCommitteeColdCertificate = {
  __typename: Cardano.CertificateType.ResignCommitteeCold,
  coldCredential: KEY_HASH_CREDENTIAL,
  anchor: {
    url: 'anchorUrl',
    dataHash: Crypto.Hash32ByteBase16(Buffer.from('anchorDataHashanchorDataHashanch').toString('hex'))
  }
};

export const ResignCommittee: Story = {
  args: {
    ...data,
    name: 'Resign Committee',
    certificates: [resignCommittee]
  }
};

const authorizeCommittee: Wallet.Cardano.AuthorizeCommitteeHotCertificate = {
  __typename: Cardano.CertificateType.AuthorizeCommitteeHot,
  coldCredential: KEY_HASH_CREDENTIAL,
  hotCredential: KEY_HASH_CREDENTIAL
};

export const AuthorizeCommittee: Story = {
  args: {
    ...data,
    name: 'Authorize Committee',
    certificates: [authorizeCommittee]
  }
};

const dRepRegistration: Wallet.Cardano.RegisterDelegateRepresentativeCertificate = {
  __typename: Cardano.CertificateType.RegisterDelegateRepresentative,
  dRepCredential: KEY_HASH_CREDENTIAL,
  deposit: DUMMY_DEPOSIT,
  anchor: {
    url: 'anchorUrl',
    dataHash: Crypto.Hash32ByteBase16(Buffer.from('anchorDataHashanchorDataHashanch').toString('hex'))
  }
};

export const DRepRegistration: Story = {
  name: 'DRep Registration',
  args: {
    ...data,
    name: 'DRep Registration',
    certificates: [dRepRegistration]
  }
};

const dRepDeRegistration: Wallet.Cardano.UnRegisterDelegateRepresentativeCertificate = {
  __typename: Cardano.CertificateType.UnregisterDelegateRepresentative,
  dRepCredential: KEY_HASH_CREDENTIAL,
  deposit: DUMMY_DEPOSIT
};

export const DRepDeRegistration: Story = {
  name: 'DRep De-Registration',
  args: {
    ...data,
    name: 'DRep De-Registration',
    certificates: [dRepDeRegistration]
  }
};

const stakeRegistrationCertificate: Wallet.Cardano.StakeAddressCertificate = {
  __typename: Cardano.CertificateType.StakeRegistration,
  stakeCredential: KEY_HASH_CREDENTIAL
};

export const StakeRegistration: Story = {
  name: 'Stake Registration',
  args: {
    ...data,
    name: 'Stake Key Registration',
    certificates: [stakeRegistrationCertificate]
  }
};

const stakeDeRegistrationCertificate: Wallet.Cardano.StakeAddressCertificate = {
  __typename: Cardano.CertificateType.StakeDeregistration,
  stakeCredential: KEY_HASH_CREDENTIAL
};

export const StakeDeRegistration: Story = {
  name: 'Stake De-Registration',
  args: {
    ...data,
    name: 'Stake Key Registration',
    certificates: [stakeDeRegistrationCertificate]
  }
};

const stakeRegistrationCertificateWithDeposit: Wallet.Cardano.NewStakeAddressCertificate = {
  __typename: Cardano.CertificateType.Registration,
  stakeCredential: KEY_HASH_CREDENTIAL,
  deposit: DUMMY_DEPOSIT
};

export const StakeRegistrationWithDeposit: Story = {
  name: 'Stake Registration (New)',
  args: {
    ...data,
    name: 'Stake Key Registration',
    certificates: [stakeRegistrationCertificateWithDeposit]
  }
};

const stakeDeRegistrationCertificateWithDeposit: Wallet.Cardano.NewStakeAddressCertificate = {
  __typename: Cardano.CertificateType.Unregistration,
  stakeCredential: KEY_HASH_CREDENTIAL,
  deposit: DUMMY_DEPOSIT
};

export const StakeDeRegistrationWithDeposit: Story = {
  name: 'Stake De-Registration (New)',
  args: {
    ...data,
    name: 'Stake Key De-Registration',
    certificates: [stakeDeRegistrationCertificateWithDeposit]
  }
};

const stakeDelegationCertificate: Wallet.Cardano.StakeDelegationCertificate = {
  __typename: Cardano.CertificateType.StakeDelegation,
  stakeCredential: KEY_HASH_CREDENTIAL,
  poolId: Cardano.PoolId('pool126zlx7728y7xs08s8epg9qp393kyafy9rzr89g4qkvv4cv93zem')
};

export const StakeDelegation: Story = {
  name: 'Stake Delegation',
  args: {
    ...data,
    name: 'Stake Delegation',
    certificates: [stakeDelegationCertificate]
  }
};

const voteDelegation: Wallet.Cardano.VoteDelegationCertificate = {
  __typename: Cardano.CertificateType.VoteDelegation,
  dRep: { __typename: 'AlwaysAbstain' },
  stakeCredential: KEY_HASH_CREDENTIAL
};

export const VoteDelegation: Story = {
  args: {
    ...data,
    name: 'Vote Delegation',
    certificates: [voteDelegation]
  }
};

export const ConfirmVote: Story = {
  args: {
    ...data,
    name: 'Confirm Vote',
    votingProcedures: mockVotingProcedures,
    explorerBaseUrl: 'https://some-test-url.io'
  }
};

export const ParameterChangeAction: Story = {
  args: {
    ...data,
    name: 'Parameter Change Action',
    proposalProcedures: [mockProposalProcedure[Cardano.GovernanceActionType.parameter_change_action]]
  }
};

export const HardForkInitiationAction: Story = {
  args: {
    ...data,
    name: 'Hard Fork Initiation Action',
    proposalProcedures: [mockProposalProcedure[Cardano.GovernanceActionType.hard_fork_initiation_action]]
  }
};

export const InfoAction: Story = {
  args: {
    ...data,
    name: 'Info Action',
    proposalProcedures: [mockProposalProcedure[Cardano.GovernanceActionType.info_action]]
  }
};

export const NewConstitutionAction: Story = {
  args: {
    ...data,
    name: 'New Constitution Action',
    proposalProcedures: [mockProposalProcedure[Cardano.GovernanceActionType.new_constitution]]
  }
};

export const NoConfidenceAction: Story = {
  args: {
    ...data,
    name: 'No Confidence Action',
    proposalProcedures: [mockProposalProcedure[Cardano.GovernanceActionType.no_confidence]]
  }
};

export const UpdateCommitteeAction: Story = {
  args: {
    ...data,
    name: 'Update Committee Action',
    proposalProcedures: [mockProposalProcedure[Cardano.GovernanceActionType.update_committee]]
  }
};

export const TreasuryWithdrawalsAction: Story = {
  args: {
    ...data,
    name: 'Treasury Withdrawals Action',
    proposalProcedures: [mockProposalProcedure[Cardano.GovernanceActionType.treasury_withdrawals_action]]
  }
};
