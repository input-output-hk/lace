import type { Meta, StoryObj } from '@storybook/react';

import { AssetActivityList } from './AssetActivityList';
import { ComponentProps } from 'react';
import {
  ConwayEraGovernanceActions,
  Cip1694GovernanceActivityType,
  ConwayEraCertificatesTypes
} from '../ActivityDetail';
import { ActivityStatus } from '../Transaction';

const meta: Meta<typeof AssetActivityList> = {
  title: 'Sanchonet/ActivityHistory/AssetActivityList',
  component: AssetActivityList,
  parameters: {
    layout: 'centered'
  }
};

export default meta;
type Story = StoryObj<typeof AssetActivityList>;

const activityTypes = [
  ConwayEraGovernanceActions.vote,
  Cip1694GovernanceActivityType.HardForkInitiationAction,
  Cip1694GovernanceActivityType.NewConstitution,
  Cip1694GovernanceActivityType.NoConfidence,
  Cip1694GovernanceActivityType.ParameterChangeAction,
  Cip1694GovernanceActivityType.TreasuryWithdrawalsAction,
  Cip1694GovernanceActivityType.UpdateCommittee,
  ConwayEraCertificatesTypes.UpdateDelegateRepresentative,
  Cip1694GovernanceActivityType.InfoAction,
  ConwayEraCertificatesTypes.StakeVoteDelegation,
  ConwayEraCertificatesTypes.StakeRegistrationDelegation,
  ConwayEraCertificatesTypes.VoteRegistrationDelegation,
  ConwayEraCertificatesTypes.StakeVoteRegistrationDelegation,
  ConwayEraCertificatesTypes.ResignCommitteeCold,
  ConwayEraCertificatesTypes.AuthorizeCommitteeHot,
  ConwayEraCertificatesTypes.RegisterDelegateRepresentative,
  ConwayEraCertificatesTypes.UnregisterDelegateRepresentative,
  ConwayEraCertificatesTypes.VoteDelegation
];

const data: ComponentProps<typeof AssetActivityList> = {
  items: activityTypes.map((type) => ({
    amount: '0.17 ADA',
    fiatAmount: '0.04 USD',
    type,
    status: ActivityStatus.SUCCESS,
    formattedTimestamp: '00:00:00'
  }))
};

export const Overview: Story = {
  args: {
    ...data
  }
};
