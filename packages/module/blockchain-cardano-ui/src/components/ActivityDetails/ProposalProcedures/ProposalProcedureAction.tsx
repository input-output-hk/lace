import { Cardano } from '@cardano-sdk/core';
import React from 'react';

import {
  getHardForkInitiationActionViewData,
  getInfoActionViewData,
  getNewConstitutionActionViewData,
  getNoConfidenceActionViewData,
  getParameterChangeActionViewData,
  getTreasuryWithdrawalsActionViewData,
  getUpdateCommitteeActionViewData,
} from '../../../utils/governance-action';

import {
  HardForkInitiationAction,
  InfoAction,
  NewConstitutionAction,
  NoConfidenceAction,
  ParameterChangeAction,
  TreasuryWithdrawalsAction,
  UpdateCommitteeAction,
} from './index';

import type { NetworkType } from '@lace-contract/network';

interface ProposalProcedureActionProps {
  proposalProcedure: Cardano.ProposalProcedure;
  explorerBaseUrl?: string;
  networkType: NetworkType;
}

export const ProposalProcedureAction = ({
  proposalProcedure: { deposit, rewardAccount, anchor, governanceAction },
  explorerBaseUrl = '',
  networkType,
}: ProposalProcedureActionProps): React.ReactElement => {
  switch (governanceAction.__typename) {
    case Cardano.GovernanceActionType.parameter_change_action:
      return (
        <ParameterChangeAction
          key={`${governanceAction.__typename}_${anchor.dataHash}`}
          data={getParameterChangeActionViewData({
            governanceAction,
            deposit,
            rewardAccount,
            anchor,
            explorerBaseUrl,
            networkType,
          })}
        />
      );
    case Cardano.GovernanceActionType.hard_fork_initiation_action:
      return (
        <HardForkInitiationAction
          key={`${governanceAction.__typename}_${anchor.dataHash}`}
          data={getHardForkInitiationActionViewData({
            governanceAction,
            deposit,
            rewardAccount,
            anchor,
            explorerBaseUrl,
            networkType,
          })}
        />
      );

    case Cardano.GovernanceActionType.info_action:
      return (
        <InfoAction
          key={`${governanceAction.__typename}_${anchor.dataHash}`}
          data={getInfoActionViewData({
            anchor,
            explorerBaseUrl,
            rewardAccount,
            deposit,
            networkType,
          })}
        />
      );
    case Cardano.GovernanceActionType.new_constitution:
      return (
        <NewConstitutionAction
          key={`${governanceAction.__typename}_${anchor.dataHash}`}
          data={getNewConstitutionActionViewData({
            governanceAction,
            deposit,
            rewardAccount,
            anchor,
            explorerBaseUrl,
            networkType,
          })}
        />
      );
    case Cardano.GovernanceActionType.no_confidence:
      return (
        <NoConfidenceAction
          key={`${governanceAction.__typename}_${anchor.dataHash}`}
          data={getNoConfidenceActionViewData({
            governanceAction,
            deposit,
            rewardAccount,
            anchor,
            explorerBaseUrl,
            networkType,
          })}
        />
      );
    case Cardano.GovernanceActionType.treasury_withdrawals_action:
      return (
        <TreasuryWithdrawalsAction
          key={`${governanceAction.__typename}_${anchor.dataHash}`}
          data={getTreasuryWithdrawalsActionViewData({
            governanceAction,
            deposit,
            rewardAccount,
            anchor,
            explorerBaseUrl,
            networkType,
          })}
        />
      );
    case Cardano.GovernanceActionType.update_committee:
      return (
        <UpdateCommitteeAction
          key={`${governanceAction.__typename}_${anchor.dataHash}`}
          data={getUpdateCommitteeActionViewData({
            governanceAction,
            deposit,
            rewardAccount,
            anchor,
            explorerBaseUrl,
            networkType,
          })}
        />
      );
    default:
      throw new Error('unsupported governanceAction');
  }
};
