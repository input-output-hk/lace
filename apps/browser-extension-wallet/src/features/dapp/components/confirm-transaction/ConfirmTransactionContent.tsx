import React from 'react';
import { Skeleton } from 'antd';
import { ConfirmDRepRegistrationContainer } from './ConfirmDRepRegistrationContainer';
import { DappTransactionContainer } from './DappTransactionContainer';
import { TxType } from './utils';
import { SignTxData } from './types';
import { ConfirmDRepRetirementContainer } from './ConfirmDRepRetirementContainer';
import { ConfirmVoteDelegationContainer } from './ConfirmVoteDelegationContainer';
import { VotingProceduresContainer } from './VotingProceduresContainer';
import { ConfirmDRepUpdateContainer } from './ConfirmDRepUpdateContainer';
import { ConfirmVoteRegistrationDelegationContainer } from './ConfirmVoteRegistrationDelegationContainer';
import { ConfirmStakeRegistrationDelegationContainer } from './ConfirmStakeRegistrationDelegationContainer';
import { ConfirmStakeVoteRegistrationDelegationContainer } from './ConfirmStakeVoteRegistrationDelegationContainer';
import { ConfirmStakeVoteDelegationContainer } from './ConfirmStakeVoteDelegationContainer';

interface Props {
  txType?: TxType;
  signTxData?: SignTxData;
  errorMessage?: string;
}

export const ConfirmTransactionContent = ({ txType, signTxData, errorMessage }: Props): React.ReactElement => {
  if (!signTxData) {
    return <Skeleton loading />;
  }
  if (txType === TxType.DRepRegistration) {
    return <ConfirmDRepRegistrationContainer signTxData={signTxData} errorMessage={errorMessage} />;
  }
  if (txType === TxType.DRepRetirement) {
    return <ConfirmDRepRetirementContainer signTxData={signTxData} errorMessage={errorMessage} />;
  }
  if (txType === TxType.DRepUpdate) {
    return <ConfirmDRepUpdateContainer signTxData={signTxData} errorMessage={errorMessage} />;
  }
  if (txType === TxType.VoteDelegation) {
    return <ConfirmVoteDelegationContainer signTxData={signTxData} errorMessage={errorMessage} />;
  }
  if (txType === TxType.VotingProcedures) {
    return <VotingProceduresContainer signTxData={signTxData} errorMessage={errorMessage} />;
  }
  if (txType === TxType.VoteRegistrationDelegation) {
    return <ConfirmVoteRegistrationDelegationContainer signTxData={signTxData} errorMessage={errorMessage} />;
  }
  if (txType === TxType.StakeRegistrationDelegation) {
    return <ConfirmStakeRegistrationDelegationContainer signTxData={signTxData} errorMessage={errorMessage} />;
  }
  if (txType === TxType.StakeVoteDelegationRegistration) {
    return <ConfirmStakeVoteRegistrationDelegationContainer signTxData={signTxData} errorMessage={errorMessage} />;
  }

  if (txType === TxType.StakeVoteDelegation) {
    return <ConfirmStakeVoteDelegationContainer signTxData={signTxData} errorMessage={errorMessage} />;
  }

  return <DappTransactionContainer signTxData={signTxData} errorMessage={errorMessage} />;
};
