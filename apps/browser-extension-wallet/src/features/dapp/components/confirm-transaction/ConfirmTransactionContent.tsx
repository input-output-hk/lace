import React from 'react';
import { Skeleton } from 'antd';
import { ConfirmDRepRegistrationContainer } from './ConfirmDRepRegistrationContainer';
import { DappTransactionContainer } from './DappTransactionContainer';
import { TxType } from './utils';
import { SignTxData } from './types';
import { ConfirmDRepRetirementContainer } from './ConfirmDRepRetirementContainer';
import { VotingProceduresContainer } from './VotingProceduresContainer';

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
  if (txType === TxType.VotingProcedures) {
    return <VotingProceduresContainer signTxData={signTxData} errorMessage={errorMessage} />;
  }

  return <DappTransactionContainer signTxData={signTxData} errorMessage={errorMessage} />;
};
