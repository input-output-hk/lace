/* eslint-disable complexity */
import React from 'react';
import { Skeleton } from 'antd';
import { Wallet } from '@lace/cardano';
// import { SignTxData } from './types';
import { ConfirmDRepRegistrationContainer } from './ConfirmDRepRegistrationContainer';
import { DappTransactionContainer } from './DappTransactionContainer';
import { ConfirmDRepRetirementContainer } from './ConfirmDRepRetirementContainer';
import { ConfirmVoteDelegationContainer } from './ConfirmVoteDelegationContainer';
import { VotingProceduresContainer } from './VotingProceduresContainer';
import { ConfirmDRepUpdateContainer } from './ConfirmDRepUpdateContainer';
import { ConfirmVoteRegistrationDelegationContainer } from './ConfirmVoteRegistrationDelegationContainer';
import { ConfirmStakeRegistrationDelegationContainer } from './ConfirmStakeRegistrationDelegationContainer';
import { ConfirmStakeVoteRegistrationDelegationContainer } from './ConfirmStakeVoteRegistrationDelegationContainer';
import { ConfirmStakeVoteDelegationContainer } from './ConfirmStakeVoteDelegationContainer';
import { ProposalProceduresContainer } from './ProposalProceduresContainer';

interface Props {
  txType?: Wallet.Cip30TxType;
  errorMessage?: string;
  onError?: () => void;
}

export const ConfirmTransactionContent = ({ txType, onError, errorMessage }: Props): React.ReactElement => {
  if (!txType) {
    return <Skeleton loading />;
  }
  if (txType === Wallet.Cip30TxType.DRepRegistration) {
    return <ConfirmDRepRegistrationContainer errorMessage={errorMessage} />;
  }
  if (txType === Wallet.Cip30TxType.DRepRetirement) {
    return <ConfirmDRepRetirementContainer onError={onError} errorMessage={errorMessage} />;
  }
  if (txType === Wallet.Cip30TxType.DRepUpdate) {
    return <ConfirmDRepUpdateContainer errorMessage={errorMessage} />;
  }
  if (txType === Wallet.Cip30TxType.VoteDelegation) {
    return <ConfirmVoteDelegationContainer errorMessage={errorMessage} />;
  }
  if (txType === Wallet.Cip30TxType.VotingProcedures) {
    return <VotingProceduresContainer errorMessage={errorMessage} />;
  }
  if (txType === Wallet.Cip30TxType.VoteRegistrationDelegation) {
    return <ConfirmVoteRegistrationDelegationContainer errorMessage={errorMessage} />;
  }
  if (txType === Wallet.Cip30TxType.StakeRegistrationDelegation) {
    return <ConfirmStakeRegistrationDelegationContainer errorMessage={errorMessage} />;
  }
  if (txType === Wallet.Cip30TxType.StakeVoteDelegationRegistration) {
    return <ConfirmStakeVoteRegistrationDelegationContainer errorMessage={errorMessage} />;
  }
  if (txType === Wallet.Cip30TxType.StakeVoteDelegation) {
    return <ConfirmStakeVoteDelegationContainer errorMessage={errorMessage} />;
  }
  if (txType === Wallet.Cip30TxType.ProposalProcedures) {
    return <ProposalProceduresContainer errorMessage={errorMessage} />;
  }

  return <DappTransactionContainer errorMessage={errorMessage} />;
};
