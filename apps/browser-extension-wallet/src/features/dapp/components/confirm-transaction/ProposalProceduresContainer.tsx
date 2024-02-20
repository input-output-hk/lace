/* eslint-disable consistent-return */
/* eslint-disable complexity */
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

interface Props {
  errorMessage?: string;
}

export const ProposalProceduresContainer = ({ errorMessage }: Props): React.ReactElement => {
  const [proposalProcedures, setProposalProcedures] = useState<Wallet.Cardano.ProposalProcedure[]>([]);
  const {
    signTxRequest: { request },
    dappInfo
  } = useViewsFlowContext();

  useEffect(() => {
    const getCertificateData = async () => {
      const procedures = await proposalProceduresInspector(request.transaction.toCore());
      setProposalProcedures(procedures);
    };

    getCertificateData();
  }, [request]);

  const props = useMemo(() => ({ dappInfo, errorMessage }), [dappInfo, errorMessage]);

  return (
    <>
      {proposalProcedures.map(({ deposit, rewardAccount, anchor, governanceAction }) => {
        const key = `${governanceAction.__typename}_${anchor.dataHash}`;
        if (governanceAction.__typename === Wallet.Cardano.GovernanceActionType.hard_fork_initiation_action) {
          return (
            <HardForkInitiationActionContainer
              key={key}
              {...{ ...props, deposit, rewardAccount, anchor, governanceAction }}
            />
          );
        }
        if (governanceAction.__typename === Wallet.Cardano.GovernanceActionType.info_action) {
          return <InfoActionContainer key={key} {...{ ...props, deposit, rewardAccount, anchor, governanceAction }} />;
        }
        if (governanceAction.__typename === Wallet.Cardano.GovernanceActionType.new_constitution) {
          return (
            <NewConstitutionActionContainer
              key={key}
              {...{ ...props, deposit, rewardAccount, anchor, governanceAction }}
            />
          );
        }
        if (governanceAction.__typename === Wallet.Cardano.GovernanceActionType.no_confidence) {
          return (
            <NoConfidenceActionContainer
              key={key}
              {...{ ...props, deposit, rewardAccount, anchor, governanceAction }}
            />
          );
        }
        if (governanceAction.__typename === Wallet.Cardano.GovernanceActionType.parameter_change_action) {
          return (
            <ParameterChangeActionContainer
              key={key}
              {...{ ...props, deposit, rewardAccount, anchor, governanceAction }}
            />
          );
        }
        if (governanceAction.__typename === Wallet.Cardano.GovernanceActionType.treasury_withdrawals_action) {
          return (
            <TreasuryWithdrawalsActionContainer
              key={key}
              {...{ ...props, deposit, rewardAccount, anchor, governanceAction }}
            />
          );
        }
        if (governanceAction.__typename === Wallet.Cardano.GovernanceActionType.update_committee) {
          return (
            <UpdateCommitteeActionContainer
              key={key}
              {...{ ...props, deposit, rewardAccount, anchor, governanceAction }}
            />
          );
        }
      })}
    </>
  );
};
