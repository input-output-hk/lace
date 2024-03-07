import React, { useEffect, useMemo, useState } from 'react';
import { Wallet } from '@lace/cardano';
import { proposalProceduresInspector } from './utils';
import { HardForkInitiationActionContainer } from './proposal-procedures/HardForkInitiationActionContainer';
import { InfoActionContainer } from './proposal-procedures/InfoActionContainer';
import { NewConstitutionActionContainer } from './proposal-procedures/NewConstitutionActionContainer';
import { NoConfidenceActionContainer } from './proposal-procedures/NoConfidenceActionContainer';
import { ParameterChangeActionContainer } from './proposal-procedures/ParameterChangeActionContainer';
import { TreasuryWithdrawalsActionContainer } from './proposal-procedures/TreasuryWithdrawalsActionContainer';
import { UpdateCommitteeActionContainer } from './proposal-procedures/UpdateCommitteeActionContainer';
import { useViewsFlowContext } from '@providers';
import { SignTxData } from './types';

export const ProposalProceduresContainer = (): React.ReactElement => {
  const [proposalProcedures, setProposalProcedures] = useState<Wallet.Cardano.ProposalProcedure[]>([]);
  const {
    signTxRequest: { request },
    dappInfo
  } = useViewsFlowContext();

  useEffect(() => {
    const proposalProcedureData = async () => {
      const procedures = await proposalProceduresInspector(request.transaction.toCore());
      setProposalProcedures(procedures);
    };

    proposalProcedureData();
  }, [request]);

  const containerPerTypeMap: Record<
    Wallet.Cardano.GovernanceActionType,
    (props: {
      dappInfo: SignTxData['dappInfo'];
      governanceAction: Wallet.Cardano.GovernanceAction;
      deposit: Wallet.Cardano.ProposalProcedure['deposit'];
      rewardAccount: Wallet.Cardano.ProposalProcedure['rewardAccount'];
      anchor: Wallet.Cardano.ProposalProcedure['anchor'];
      errorMessage?: string;
    }) => React.ReactElement
  > = useMemo(
    () => ({
      [Wallet.Cardano.GovernanceActionType.hard_fork_initiation_action]: HardForkInitiationActionContainer,
      [Wallet.Cardano.GovernanceActionType.info_action]: InfoActionContainer,
      [Wallet.Cardano.GovernanceActionType.new_constitution]: NewConstitutionActionContainer,
      [Wallet.Cardano.GovernanceActionType.no_confidence]: NoConfidenceActionContainer,
      [Wallet.Cardano.GovernanceActionType.parameter_change_action]: ParameterChangeActionContainer,
      [Wallet.Cardano.GovernanceActionType.treasury_withdrawals_action]: TreasuryWithdrawalsActionContainer,
      [Wallet.Cardano.GovernanceActionType.update_committee]: UpdateCommitteeActionContainer
    }),
    []
  );

  return (
    <>
      {proposalProcedures.map(({ deposit, rewardAccount, anchor, governanceAction }) => {
        const Container = containerPerTypeMap[governanceAction.__typename];
        return (
          <Container
            key={`${governanceAction.__typename}_${anchor.dataHash}`}
            {...{ dappInfo, deposit, rewardAccount, anchor, governanceAction }}
          />
        );
      })}
    </>
  );
};
