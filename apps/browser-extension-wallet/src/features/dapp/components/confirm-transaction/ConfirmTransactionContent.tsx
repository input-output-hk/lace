/* eslint-disable complexity */
import React, { useMemo } from 'react';
import { Skeleton } from 'antd';
import { Wallet } from '@lace/cardano';
import { SignTxData } from './types';
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
  signTxData?: SignTxData;
  errorMessage?: string;
  onError?: () => void;
}

export const ConfirmTransactionContent = ({ txType, signTxData, onError, errorMessage }: Props): React.ReactElement => {
  const containerPerTypeMap: Record<
    Wallet.Cip30TxType,
    (props: { signTxData: SignTxData; errorMessage?: string; onError?: () => void }) => React.ReactElement
  > = useMemo(
    () => ({
      [Wallet.Cip30TxType.DRepRegistration]: ConfirmDRepRegistrationContainer,
      [Wallet.Cip30TxType.DRepRetirement]: ConfirmDRepRetirementContainer,
      [Wallet.Cip30TxType.DRepUpdate]: ConfirmDRepUpdateContainer,
      [Wallet.Cip30TxType.VoteDelegation]: ConfirmVoteDelegationContainer,
      [Wallet.Cip30TxType.VotingProcedures]: VotingProceduresContainer,
      [Wallet.Cip30TxType.VoteRegistrationDelegation]: ConfirmVoteRegistrationDelegationContainer,
      [Wallet.Cip30TxType.StakeRegistrationDelegation]: ConfirmStakeRegistrationDelegationContainer,
      [Wallet.Cip30TxType.StakeVoteDelegationRegistration]: ConfirmStakeVoteRegistrationDelegationContainer,
      [Wallet.Cip30TxType.StakeVoteDelegation]: ConfirmStakeVoteDelegationContainer,
      [Wallet.Cip30TxType.ProposalProcedures]: ProposalProceduresContainer,
      Send: undefined,
      Mint: undefined,
      Burn: undefined
    }),
    []
  );

  if (!signTxData || !txType) {
    return <Skeleton loading />;
  }

  const Container = containerPerTypeMap[txType] || DappTransactionContainer;

  return <Container onError={onError} signTxData={signTxData} errorMessage={errorMessage} />;
};
