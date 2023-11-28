import React from 'react';
import { TxType } from '../utils';
import { SignTxData } from '../types';
import { ConfirmTransactionFooterCommon } from './ConfirmTransactionFooterCommon';
import { ConfirmDRepRetirementFooter } from './ConfirmDRepRetirementFooter';

type ConfirmTransactionFooterProps = {
  txType?: TxType;
  signTxData?: SignTxData;
  errorMessage?: string;
};

export const ConfirmTransactionFooter = ({
  txType,
  signTxData,
  errorMessage
}: ConfirmTransactionFooterProps): React.ReactElement => {
  if (txType === TxType.DRepRetirement) {
    return <ConfirmDRepRetirementFooter signTxData={signTxData} errorMessage={errorMessage} />;
  }

  return <ConfirmTransactionFooterCommon errorMessage={errorMessage} />;
};
