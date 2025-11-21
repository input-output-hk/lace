import React, { useEffect } from 'react';
import { AppMode } from '@src/utils/constants';
import { MainLoader } from '@components/MainLoader';
import { CorruptedData } from './CorruptedData';
import { DataCheckDispatcher, useDataCheck } from '@hooks/useDataCheck';
import { walletRepository } from '@lib/wallet-api-ui';

const isFeatureEnabled = process.env.USE_DATA_CHECK === 'true';

export interface DataCheckContainerProps {
  children: React.ReactNode;
  appMode: AppMode;
  dataCheckDispatcher?: DataCheckDispatcher;
}

export const DataCheckContainer = ({
  children,
  appMode,
  dataCheckDispatcher
}: DataCheckContainerProps): React.ReactElement => {
  const [dataCheckState, performDataCheck] = useDataCheck(dataCheckDispatcher);

  useEffect(() => {
    // Run only on mount
    if (isFeatureEnabled) performDataCheck(walletRepository);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isFeatureEnabled) return <>{children}</>;

  if (dataCheckState.checkState !== 'checked') return <MainLoader />;
  return dataCheckState.result.valid === false ? <CorruptedData appMode={appMode} /> : <>{children}</>;
};
