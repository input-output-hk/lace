import { Wallet } from '@lace/cardano';
import {
  HardForkInitiationAction,
  InfoAction,
  NewConstitutionAction,
  NoConfidenceAction,
  ParameterChangeAction,
  TreasuryWithdrawalsAction,
  UpdateCommitteeAction
} from '@src/ui/components/ProposalProcedures';
import {
  getHardForkInitiationActionViewData,
  getInfoActionViewData,
  getNewConstitutionActionViewData,
  getNoConfidenceActionViewData,
  getParameterChangeActionViewData,
  getTreasuryWithdrawalsActionViewData,
  getUpdateCommitteeActionViewData
} from '@src/ui/utils';
import React from 'react';

interface ProposalProcedureActionProps {
  proposalProcedure: Wallet.Cardano.ProposalProcedure;
  cardanoCoin: Wallet.CoinId;
  explorerBaseUrl: string;
}

export const ProposalProcedureAction = ({
  proposalProcedure: { deposit, rewardAccount, anchor, governanceAction },
  cardanoCoin,
  explorerBaseUrl
}: ProposalProcedureActionProps): React.ReactElement => {
  switch (governanceAction.__typename) {
    case Wallet.Cardano.GovernanceActionType.parameter_change_action:
      return (
        <ParameterChangeAction
          key={`${governanceAction.__typename}_${anchor.dataHash}`}
          data={getParameterChangeActionViewData({
            governanceAction,
            deposit,
            rewardAccount,
            anchor,
            cardanoCoin,
            explorerBaseUrl
          })}
        />
      );
    case Wallet.Cardano.GovernanceActionType.hard_fork_initiation_action:
      return (
        <HardForkInitiationAction
          key={`${governanceAction.__typename}_${anchor.dataHash}`}
          data={getHardForkInitiationActionViewData({
            governanceAction,
            deposit,
            rewardAccount,
            anchor,
            cardanoCoin,
            explorerBaseUrl
          })}
        />
      );

    case Wallet.Cardano.GovernanceActionType.info_action:
      return (
        <InfoAction
          key={`${governanceAction.__typename}_${anchor.dataHash}`}
          data={getInfoActionViewData({
            anchor,
            explorerBaseUrl,
            rewardAccount,
            cardanoCoin,
            deposit
          })}
        />
      );
    case Wallet.Cardano.GovernanceActionType.new_constitution:
      return (
        <NewConstitutionAction
          key={`${governanceAction.__typename}_${anchor.dataHash}`}
          data={getNewConstitutionActionViewData({
            governanceAction,
            deposit,
            rewardAccount,
            anchor,
            cardanoCoin,
            explorerBaseUrl
          })}
        />
      );
    case Wallet.Cardano.GovernanceActionType.no_confidence:
      return (
        <NoConfidenceAction
          key={`${governanceAction.__typename}_${anchor.dataHash}`}
          data={getNoConfidenceActionViewData({
            governanceAction,
            deposit,
            rewardAccount,
            anchor,
            cardanoCoin,
            explorerBaseUrl
          })}
        />
      );
    case Wallet.Cardano.GovernanceActionType.treasury_withdrawals_action:
      return (
        <TreasuryWithdrawalsAction
          key={`${governanceAction.__typename}_${anchor.dataHash}`}
          data={getTreasuryWithdrawalsActionViewData({
            governanceAction,
            deposit,
            rewardAccount,
            anchor,
            cardanoCoin,
            explorerBaseUrl
          })}
        />
      );
    case Wallet.Cardano.GovernanceActionType.update_committee:
      return (
        <UpdateCommitteeAction
          key={`${governanceAction.__typename}_${anchor.dataHash}`}
          data={getUpdateCommitteeActionViewData({
            governanceAction,
            deposit,
            rewardAccount,
            anchor,
            cardanoCoin,
            explorerBaseUrl
          })}
        />
      );
    default:
      throw new Error('unsupported governanceAction');
  }
};
