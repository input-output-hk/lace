import React from 'react';
import { Skeleton } from 'antd';
import { ConfirmDRepRegistrationContainer } from './ConfirmDRepRegistrationContainer';
import { DappTransactionContainer } from './DappTransactionContainer';
import { SignTxData } from './types';
import { ConfirmDRepRetirementContainer } from './ConfirmDRepRetirementContainer';
import { ConfirmVoteDelegationContainer } from './ConfirmVoteDelegationContainer';
import { VotingProceduresContainer } from './VotingProceduresContainer';
import { ConfirmDRepUpdateContainer } from './ConfirmDRepUpdateContainer';
import { Wallet } from '@lace/cardano';

interface Props {
  txType?: Wallet.Cip30TxType;
  signTxData?: SignTxData;
  errorMessage?: string;
  onError?: () => void;
}

export const ConfirmTransactionContent = ({ txType, signTxData, onError, errorMessage }: Props): React.ReactElement => {
  if (!signTxData) {
    return <Skeleton loading />;
  }
  if (txType === Wallet.Cip30TxType.DRepRegistration) {
    return <ConfirmDRepRegistrationContainer signTxData={signTxData} errorMessage={errorMessage} />;
  }
  if (txType === Wallet.Cip30TxType.DRepRetirement) {
    return <ConfirmDRepRetirementContainer signTxData={signTxData} onError={onError} errorMessage={errorMessage} />;
  }
  if (txType === Wallet.Cip30TxType.DRepUpdate) {
    return <ConfirmDRepUpdateContainer signTxData={signTxData} errorMessage={errorMessage} />;
  }
  if (txType === Wallet.Cip30TxType.VoteDelegation) {
    return <ConfirmVoteDelegationContainer signTxData={signTxData} errorMessage={errorMessage} />;
  }
  if (txType === Wallet.Cip30TxType.VotingProcedures) {
    return <VotingProceduresContainer signTxData={signTxData} errorMessage={errorMessage} />;
  }

  return <DappTransactionContainer signTxData={signTxData} errorMessage={errorMessage} />;
};
