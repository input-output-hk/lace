import React from 'react';
// import { useTranslation } from 'react-i18next';
import { Skeleton } from 'antd';
import { SignTxData } from './types';

export const DRepRegistrationContent = ({ signTxData }: { signTxData: SignTxData }): React.ReactElement => {
  // const { t } = useTranslation();
  const tx = signTxData?.tx;

  return <>{tx ? <></> : <Skeleton loading />}</>;
};
