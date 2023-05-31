import React from 'react';
import { useWalletStore } from '../../../../../../stores';
import { useInitializeTx } from '../../../../../../hooks';
import { useTransactionProps, useBuitTxState, useMetadata } from '../../store';

export interface FormLayoutProps {
  children: React.ReactNode;
}

export const FormLayout = ({ children }: FormLayoutProps): React.ReactElement => {
  const { outputMap, hasInvalidOutputs } = useTransactionProps();
  const [metadata] = useMetadata();
  const { setBuiltTxData } = useBuitTxState();
  const { inMemoryWallet } = useWalletStore();
  useInitializeTx(inMemoryWallet, setBuiltTxData, { outputs: outputMap, metadata, hasInvalidOutputs });

  return <div style={{ paddingBottom: '19px' }}>{children}</div>;
};
