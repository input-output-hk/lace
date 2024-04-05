/* eslint-disable no-console */
/* eslint-disable sonarjs/no-duplicate-string */
import type { Meta, StoryObj } from '@storybook/react';

import { TransactionDetails } from './TransactionDetails';
import { ComponentProps } from 'react';
import { ActivityStatus } from '../Activity/AssetActivityItem';
import { Wallet } from '@lace/cardano';
import { ConwayEraCertificatesTypes } from './types';

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
  openExternalLink: (url) => window.open(url, '_blank', 'noopener,noreferrer'),
  handleOpenExternalHashLink: () => {
    console.log('handle on hash click', '639a43144dc2c0ead16f2fb753360f4b4f536502dbdb8aa5e424b00abb7534ff');
  },
  ownAddresses: []
};

const stakeVoteDelegationCertificate = [
  {
    title: 'certificateType',
    details: [ConwayEraCertificatesTypes.StakeVoteDelegation]
  },
  {
    title: 'stakeKey',
    details: ['stake1u929x2y7nnfm797upl7v9rc39pqg87pk5cygvnn2edqmvuq6h48su']
  },
  {
    title: 'poolId',
    details: ['pool1k0ucs0fau2vhr3p7qh7mnpfgrllwwda7petxjz2gzzaxkyp8f88']
  },
  {
    title: 'drep',
    details: ['drep1cs234l5mtapethapx8cq97nkpa27xf84phruh5f6jqxa78ymlp4']
  }
];
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

const stakeRegistrationDelegationCertificate = [
  {
    title: 'certificateType',
    details: [ConwayEraCertificatesTypes.StakeRegistrationDelegation]
  },
  {
    title: 'stakeKey',
    details: ['stake1u929x2y7nnfm797upl7v9rc39pqg87pk5cygvnn2edqmvuq6h48su']
  },
  {
    title: 'poolId',
    details: ['pool1k0ucs0fau2vhr3p7qh7mnpfgrllwwda7petxjz2gzzaxkyp8f88']
  },
  {
    title: 'depositPaid',
    info: 'depositPaidInfo',
    details: [['2.00 ADA', '0.08 USD']]
  }
];

export const StakeRegistrationDelegationCertificate: Story = {
  args: {
    ...data,
    name: 'Stake Registration Delegation Certificate',
    certificates: [stakeRegistrationDelegationCertificate]
  }
};

const voteRegistrationDelegationCertificate = [
  {
    title: 'certificateType',
    details: [ConwayEraCertificatesTypes.VoteRegistrationDelegation]
  },
  {
    title: 'stakeKey',
    details: ['stake1u929x2y7nnfm797upl7v9rc39pqg87pk5cygvnn2edqmvuq6h48su']
  },
  {
    title: 'drepId',
    details: ['drep1cs234l5mtapethapx8cq97nkpa27xf84phruh5f6jqxa78ymlp4']
  },
  {
    title: 'depositPaid',
    info: 'depositPaidInfo',
    details: [['2.00 ADA', '0.08 USD']]
  }
];

export const VoteRegistrationDelegationCertificate: Story = {
  args: {
    ...data,
    name: 'Vote Registration Delegation Certificate',
    certificates: [voteRegistrationDelegationCertificate]
  }
};

const stakeVoteRegistrationDelegationCertificate = [
  {
    title: 'certificateType',
    details: [ConwayEraCertificatesTypes.StakeVoteRegistrationDelegation]
  },
  {
    title: 'stakeKey',
    details: ['stake1u929x2y7nnfm797upl7v9rc39pqg87pk5cygvnn2edqmvuq6h48su']
  },
  {
    title: 'poolId',
    details: ['pool1k0ucs0fau2vhr3p7qh7mnpfgrllwwda7petxjz2gzzaxkyp8f88']
  },
  {
    title: 'drepId',
    details: ['drep1cs234l5mtapethapx8cq97nkpa27xf84phruh5f6jqxa78ymlp4']
  },
  {
    title: 'depositPaid',
    info: 'depositPaidInfo',
    details: [['2.00 ADA', '0.08 USD']]
  }
];

export const StakeVoteRegistrationDelegationCertificate: Story = {
  args: {
    ...data,
    name: 'Stake Vote Registration Delegation Certificate',
    certificates: [stakeVoteRegistrationDelegationCertificate]
  }
};

const updateDRep = [
  {
    title: 'certificateType',
    details: [ConwayEraCertificatesTypes.UpdateDelegateRepresentative]
  },
  {
    title: 'drepId',
    details: ['65ge6g54g5dd5']
  },
  {
    title: 'anchorHash',
    details: ['3d2a9d15382c14f5ca260a2f5bfb645fe148bfe10c1d0e1d305b7b1393e2bd97']
  },
  {
    title: 'anchorURL',
    details: [
      'https://raw.githubusercontent.com/Ryun1/gov-metadata/main/governace-action/metadata.jsonldr1q99...uqvzlalu'
    ]
  }
];

export const UpdateDRep: Story = {
  name: 'Update DRep',
  args: {
    ...data,
    name: 'Update DRep',
    certificates: [updateDRep]
  }
};

const resignCommittee = [
  {
    title: 'certificateType',
    details: [ConwayEraCertificatesTypes.ResignCommitteeCold]
  },
  {
    title: 'coldCredential',
    details: ['65ge6g54g5dd5']
  },
  {
    title: 'anchorHash',
    details: ['3d2a9d15382c14f5ca260a2f5bfb645fe148bfe10c1d0e1d305b7b1393e2bd97']
  },
  {
    title: 'anchorURL',
    details: [
      'https://raw.githubusercontent.com/Ryun1/gov-metadata/main/governace-action/metadata.jsonldr1q99...uqvzlalu'
    ]
  }
];

export const ResignCommittee: Story = {
  args: {
    ...data,
    name: 'Resign Committee',
    certificates: [resignCommittee]
  }
};

const authorizeCommittee = [
  {
    title: 'certificateType',
    details: [ConwayEraCertificatesTypes.AuthorizeCommitteeHot]
  },
  {
    title: 'coldCredential',
    details: ['cc_cold 65ge6g54g5dd5']
  },
  {
    title: 'hotCredential',
    details: ['cc_hot stake1u929x2y7nnfm797upl7v9rc39pqg87pk5cygvnn2edqmvuq6h48su']
  }
];

export const AuthorizeCommittee: Story = {
  args: {
    ...data,
    name: 'Authorize Committee',
    certificates: [authorizeCommittee]
  }
};

const dRepRegistration = [
  {
    title: 'certificateType',
    details: [ConwayEraCertificatesTypes.RegisterDelegateRepresentative]
  },
  {
    title: 'drepId',
    details: ['drep170ef53apap7dadzemkcd7lujlzk5hyzvzzjj7f3sx89ecn3ft6u']
  },
  {
    title: 'anchorHash',
    details: ['3d2a9d15382c14f5ca260a2f5bfb645fe148bfe10c1d0e1d305b7b1393e2bd97']
  },
  {
    title: 'anchorURL',
    details: [
      'https://raw.githubusercontent.com/Ryun1/gov-metadata/main/governace-action/metadata.jsonldr1q99...uqvzlalu'
    ]
  },
  {
    title: 'depositPaid',
    info: 'depositPaidInfo',
    details: [['0.35 ADA', '0.08 USD']]
  }
];

export const DRepRegistration: Story = {
  name: 'DRep Registration',
  args: {
    ...data,
    name: 'DRep Registration',
    certificates: [dRepRegistration]
  }
};

const dRepDeRegistration = [
  {
    title: 'certificateType',
    details: [ConwayEraCertificatesTypes.UnregisterDelegateRepresentative]
  },
  {
    title: 'drepId',
    details: ['drep170ef53apap7dadzemkcd7lujlzk5hyzvzzjj7f3sx89ecn3ft6u']
  },
  {
    title: 'depositReturned',
    info: 'depositReturnedInfo',
    details: [['0.35 ADA', '0.08 USD']]
  }
];

export const DRepDeRegistration: Story = {
  name: 'DRep De-Registration',
  args: {
    ...data,
    name: 'DRep De-Registration',
    certificates: [dRepDeRegistration]
  }
};

const voteDelegation = [
  {
    title: 'certificateType',
    details: [ConwayEraCertificatesTypes.VoteDelegation]
  },
  {
    title: 'stakeKey',
    details: ['stake1u929x2y7nnfm797upl7v9rc39pqg87pk5cygvnn2edqmvuq6h48su']
  },
  {
    title: 'drepId',
    details: ['drep1cs234l5mtapethapx8cq97nkpa27xf84phruh5f6jqxa78ymlp4']
  }
];

export const VoteDelegation: Story = {
  args: {
    ...data,
    name: 'Vote Delegation',
    certificates: [voteDelegation]
  }
};

const confirmVote = [
  {
    title: 'voterType',
    details: ['drep']
  },
  {
    title: 'voterCredential',
    details: ['drep1cs234l5mtapethapx8cq97nkpa27xf84phruh5f6jqxa78ymlp4']
  },
  {
    title: 'voteTypes',
    details: ['yes']
  },
  {
    title: 'anchorURL',
    details: ['https://shorturl.at/eK145']
  },
  {
    title: 'anchorHash',
    details: ['9067f223838d88b83f660c05eedf7f6f65c45de31e522c1bcb6a1eb287b17e89']
  }
];

export const ConfirmVote: Story = {
  args: {
    ...data,
    name: 'Confirm Vote',
    votingProcedures: [confirmVote, confirmVote]
  }
};

const parameterChangeAction = [
  {
    title: 'type',
    details: [Wallet.Cardano.GovernanceActionType.parameter_change_action]
  },
  {
    title: 'deposit',
    details: ['stake1u89sa...css5vgr']
  },
  {
    title: 'rewardAccount',
    details: ['https://www.someurl.io']
  },
  {
    title: 'anchorURL',
    details: ['https://www.someurl.io']
  },
  {
    title: 'anchorHash',
    details: ['000000...0000']
  },
  {
    header: 'maxTxExUnits',
    details: [
      {
        title: 'memory',
        details: ['100000000']
      },
      {
        title: 'step',
        details: ['10000000000000']
      }
    ]
  },
  {
    header: 'maxBlockExUnits',
    details: [
      {
        title: 'memory',
        details: ['50000000']
      },
      {
        title: 'step',
        details: ['40000000000']
      }
    ]
  },
  {
    header: 'networkGroup',
    details: [
      {
        title: 'maxBBSize',
        details: ['65536']
      },
      {
        title: 'maxTxSize',
        details: ['16384']
      },
      {
        title: 'maxBHSize',
        details: ['1100']
      },
      {
        title: 'maxValSize',
        details: ['5000']
      },
      {
        title: 'maxCollateralInputs',
        details: ['3']
      }
    ]
  },
  {
    header: 'economicGroup',
    details: [
      {
        title: 'minFeeA',
        details: ['44']
      },
      {
        title: 'minFeeB',
        details: ['155381']
      },
      {
        title: 'keyDeposit',
        details: ['2000000']
      },
      {
        title: 'poolDeposit',
        details: ['500000000']
      },
      {
        title: 'rho',
        details: ['0.003']
      },
      {
        title: 'tau',
        details: ['0.2']
      },
      {
        title: 'minPoolCost',
        details: ['340000000']
      },
      {
        title: 'coinsPerUTxOByte',
        details: ['34482']
      }
    ]
  },
  {
    header: 'costModels',
    details: [
      {
        title: 'PlutusV1',
        details: ['197209']
      },
      {
        title: 'PlutusV2',
        details: ['197209']
      }
    ]
  },
  {
    header: 'technicalGroup',
    details: [
      {
        title: 'a0',
        details: ['0.3']
      },
      {
        title: 'eMax',
        details: ['18']
      },
      {
        title: 'nOpt',
        details: ['150']
      },
      {
        title: 'collateralPercentage',
        details: ['150']
      }
    ]
  },
  {
    header: 'prices',
    details: [
      {
        title: 'memory',
        details: ['0.0577']
      },
      {
        title: 'step',
        details: ['0.0000721']
      }
    ]
  },
  {
    header: 'governanceGroup',
    details: [
      {
        title: 'govActionLifetime',
        details: ['10']
      },
      {
        title: 'govActionDeposit',
        details: ['500 ADA']
      },
      {
        title: 'drepDeposit',
        details: ['1000 ADA']
      },
      {
        title: 'drepActivity',
        details: ['5']
      },
      {
        title: 'ccMinSize',
        details: ['7']
      },
      {
        title: 'ccMaxTermLength',
        details: ['25']
      }
    ]
  },
  {
    header: 'dRepVotingThresholds',
    details: [
      {
        title: 'motionNoConfidence',
        details: ['51%']
      },
      {
        title: 'committeeNormal',
        details: ['67%']
      },
      {
        title: 'committeeNoConfidence',
        details: ['80%']
      },
      {
        title: 'updateConstitution',
        details: ['75%']
      },
      {
        title: 'hardForkInitiation',
        details: ['90%']
      },
      {
        title: 'ppNetworkGroup',
        details: ['70%']
      },
      {
        title: 'ppEconomicGroup',
        details: ['70%']
      },
      {
        title: 'ppTechnicalGroup',
        details: ['70%']
      },
      {
        title: 'ppGovernanceGroup',
        details: ['70%']
      },
      {
        title: 'treasuryWithdrawal',
        details: ['51%']
      }
    ]
  }
];

export const ParameterChangeAction: Story = {
  args: {
    ...data,
    name: 'Parameter Change Action',
    proposalProcedures: [parameterChangeAction]
  }
};

const hardForkInitiationAction = [
  {
    title: 'type',
    details: [Wallet.Cardano.GovernanceActionType.hard_fork_initiation_action]
  },
  {
    title: 'deposit',
    info: 'deposit',
    details: [['2.00 ADA', '0.18 USD']]
  },
  { title: 'rewardAccount', details: ['23bcf2892e8182a68e3aac6f9f42ed3317d115ebad12a17232681175'] },
  {
    title: 'anchorURL',
    details: [
      'https://raw.githubusercontent.com/Ryun1/gov-metadata/main/governace-action/metadata.jsonldr1q99...uqvzlalu'
    ]
  },
  {
    title: 'anchorHash',
    details: ['3d2a9d15382c14f5ca260a2f5bfb645fe148bfe10c1d0e1d305b7b1393e2bd97']
  },
  {
    title: 'governanceActionID',
    details: ['d0b1f7be72731a97e9728e0f1c358d576fd28aa9f290d53ce1ef803a1a753ba8']
  },
  {
    title: 'actionIndex',
    details: ['0']
  },
  {
    title: 'protocolVersionMajor',
    details: ['1']
  },
  {
    title: 'protocolVersionMinor',
    details: ['2']
  },
  {
    title: 'protocolVersionPatch',
    details: ['3']
  }
];

export const HardForkInitiationAction: Story = {
  args: {
    ...data,
    name: 'Hard Fork Initiation Action',
    proposalProcedures: [hardForkInitiationAction]
  }
};

const infoAction = [
  {
    title: 'type',
    details: [Wallet.Cardano.GovernanceActionType.info_action]
  },
  {
    title: 'deposit',
    info: 'deposit',
    details: [['2.00 ADA', '0.18 USD']]
  },
  {
    title: 'anchorURL',
    details: [
      'https://raw.githubusercontent.com/Ryun1/gov-metadata/main/governace-action/metadata.jsonldr1q99...uqvzlalu'
    ]
  },
  {
    title: 'anchorHash',
    details: ['3d2a9d15382c14f5ca260a2f5bfb645fe148bfe10c1d0e1d305b7b1393e2bd97']
  },
  {
    title: 'governanceActionID',
    details: ['d0b1f7be72731a97e9728e0f1c358d576fd28aa9f290d53ce1ef803a1a753ba8']
  },
  {
    title: 'actionIndex',
    details: ['0']
  }
];

export const InfoAction: Story = {
  args: {
    ...data,
    name: 'Info Action',
    proposalProcedures: [infoAction]
  }
};

const newConstitutionAction = [
  {
    title: 'type',
    details: [Wallet.Cardano.GovernanceActionType.new_constitution]
  },
  {
    title: 'anchorURL',
    details: [
      'https://raw.githubusercontent.com/Ryun1/gov-metadata/main/governace-action/metadata.jsonldr1q99...uqvzlalu'
    ]
  },
  {
    title: 'anchorHash',
    details: ['3d2a9d15382c14f5ca260a2f5bfb645fe148bfe10c1d0e1d305b7b1393e2bd97']
  },
  {
    title: 'governanceActionID',
    details: ['d0b1f7be72731a97e9728e0f1c358d576fd28aa9f290d53ce1ef803a1a753ba8']
  },
  {
    title: 'actionIndex',
    details: ['0']
  },
  {
    title: 'constitutionAnchorURL',
    details: ['https://www.someurl.io']
  },
  {
    title: 'constitutionScriptHash',
    details: ['cb0ec2692497b458e46812c8a5bfa2931d1a2d965a99893828ec810f']
  }
];

export const NewConstitutionAction: Story = {
  args: {
    ...data,
    name: 'New Constitution Action',
    proposalProcedures: [newConstitutionAction]
  }
};

const noConfidenceAction = [
  {
    title: 'type',
    details: [Wallet.Cardano.GovernanceActionType.no_confidence]
  },
  {
    title: 'deposit',
    info: 'deposit',
    details: [['2.00 ADA', '0.18 USD']]
  },
  { title: 'rewardAccount', details: ['23bcf2892e8182a68e3aac6f9f42ed3317d115ebad12a17232681175'] },
  {
    title: 'anchorURL',
    details: [
      'https://raw.githubusercontent.com/Ryun1/gov-metadata/main/governace-action/metadata.jsonldr1q99...uqvzlalu'
    ]
  },
  {
    title: 'anchorHash',
    details: ['3d2a9d15382c14f5ca260a2f5bfb645fe148bfe10c1d0e1d305b7b1393e2bd97']
  },
  {
    title: 'governanceActionID',
    details: ['d0b1f7be72731a97e9728e0f1c358d576fd28aa9f290d53ce1ef803a1a753ba8']
  },
  {
    title: 'actionIndex',
    details: ['0']
  }
];

export const NoConfidenceAction: Story = {
  args: {
    ...data,
    name: 'No Confidence Action',
    proposalProcedures: [noConfidenceAction]
  }
};

const updateCommitteeAction = [
  {
    title: 'type',
    details: [Wallet.Cardano.GovernanceActionType.update_committee]
  },
  {
    title: 'deposit',
    info: 'deposit',
    details: [['2.00 ADA', '0.18 USD']]
  },
  { title: 'rewardAccount', details: ['23bcf2892e8182a68e3aac6f9f42ed3317d115ebad12a17232681175'] },
  {
    title: 'anchorURL',
    details: [
      'https://raw.githubusercontent.com/Ryun1/gov-metadata/main/governace-action/metadata.jsonldr1q99...uqvzlalu'
    ]
  },
  {
    title: 'anchorHash',
    details: ['3d2a9d15382c14f5ca260a2f5bfb645fe148bfe10c1d0e1d305b7b1393e2bd97']
  },
  {
    title: 'governanceActionID',
    details: ['d0b1f7be72731a97e9728e0f1c358d576fd28aa9f290d53ce1ef803a1a753ba8']
  },
  {
    title: 'actionIndex',
    details: ['0']
  },
  {
    header: 'membersToBeAdded',
    details: [
      {
        title: 'coldCredentialHash',
        details: ['30000000000000000000000000000000000000000000000000000000']
      },
      {
        title: 'epoch',
        details: ['1']
      },
      {
        title: 'coldCredentialHash',
        details: ['40000000000000000000000000000000000000000000000000000000']
      },
      {
        title: 'epoch',
        details: ['2']
      }
    ]
  },
  {
    header: 'membersToBeRemoved',
    details: [
      {
        title: 'hash',
        details: ['00000000000000000000000000000000000000000000000000000000']
      }
    ]
  },
  {
    title: 'newQuorumThreshold',
    details: ['0.4%']
  }
];

export const UpdateCommitteeAction: Story = {
  args: {
    ...data,
    name: 'Update Committee Action',
    proposalProcedures: [updateCommitteeAction]
  }
};

const treasuryWithdrawalsAction = [
  {
    title: 'type',
    details: [Wallet.Cardano.GovernanceActionType.treasury_withdrawals_action]
  },
  {
    title: 'deposit',
    info: 'deposit',
    details: [['2.00 ADA', '0.18 USD']]
  },
  { title: 'rewardAccount', details: ['23bcf2892e8182a68e3aac6f9f42ed3317d115ebad12a17232681175'] },
  {
    title: 'anchorURL',
    details: [
      'https://raw.githubusercontent.com/Ryun1/gov-metadata/main/governace-action/metadata.jsonldr1q99...uqvzlalu'
    ]
  },
  {
    title: 'anchorHash',
    details: ['3d2a9d15382c14f5ca260a2f5bfb645fe148bfe10c1d0e1d305b7b1393e2bd97']
  },
  {
    title: 'governanceActionID',
    details: ['d0b1f7be72731a97e9728e0f1c358d576fd28aa9f290d53ce1ef803a1a753ba8']
  },
  {
    title: 'actionIndex',
    details: ['0']
  },
  {
    header: 'withdrawal',
    details: [
      {
        title: 'withdrawalRewardAccount',
        details: ['23bcf2892e8182a68e3aac6f9f42ed3317d115ebad12a17232681175']
      },
      {
        title: 'withdrawalAmount',
        details: ['1030939916423 ADA']
      },
      {
        title: 'withdrawalRewardAccount',
        details: ['23bcf2892e8182a68e3aac6f9f42ed3317d115ebad12a17232681175']
      },
      {
        title: 'withdrawalAmount',
        details: ['1030939916423 ADA']
      }
    ]
  }
];

export const TreasuryWithdrawalsAction: Story = {
  args: {
    ...data,
    name: 'Treasury Withdrawals Action',
    proposalProcedures: [treasuryWithdrawalsAction]
  }
};
