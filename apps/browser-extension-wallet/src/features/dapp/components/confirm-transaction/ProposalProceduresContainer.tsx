/* eslint-disable consistent-return */
/* eslint-disable complexity */
import React, { useMemo } from 'react';
import { Wallet } from '@lace/cardano';
import { SignTxData } from './types';
import { proposalProceduresInspector } from './utils';
import { HardForkInitiationActionContainer } from './proposal-procedures/HardForkInitiationActionContainer';
import { InfoActionContainer } from './proposal-procedures/InfoActionContainer';
import { NewConstitutionActionContainer } from './proposal-procedures/NewConstitutionActionContainer';
import { NoConfidenceActionContainer } from './proposal-procedures/NoConfidenceActionContainer';
import { ParameterChangeActionContainer } from './proposal-procedures/ParameterChangeActionContainer';
import { TreasuryWithdrawalsActionContainer } from './proposal-procedures/TreasuryWithdrawalsActionContainer';
import { UpdateCommitteeActionContainer } from './proposal-procedures/UpdateCommitteeActionContainer';

interface Props {
  signTxData: SignTxData;
  errorMessage?: string;
}

export const ProposalProceduresContainer = ({
  signTxData: { dappInfo, tx },
  errorMessage
}: Props): React.ReactElement => {
  const proposalProcedures = proposalProceduresInspector(tx);

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
