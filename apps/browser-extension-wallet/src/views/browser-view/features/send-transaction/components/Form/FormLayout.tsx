import React from 'react';
import { useWalletStore } from '../../../../../../stores';
import { useInitializeTx } from '../../../../../../hooks';
import { useTransactionProps, useBuiltTxState, useMetadata } from '../../store';

export interface FormLayoutProps {
  children: React.ReactNode;
}

export const FormLayout = ({ children }: FormLayoutProps): React.ReactElement => {
  const { outputsMap, hasInvalidOutputs } = useTransactionProps();
  const [metadata] = useMetadata();
  const { setBuiltTxData } = useBuiltTxState();
  const { inMemoryWallet } = useWalletStore();
  useInitializeTx(inMemoryWallet, setBuiltTxData, { outputs: outputsMap, metadata, hasInvalidOutputs });

  return <div style={{ paddingBottom: '19px' }}>{children}</div>;
};
