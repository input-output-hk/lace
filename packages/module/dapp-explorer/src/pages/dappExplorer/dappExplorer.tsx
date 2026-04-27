import { FeatureIds } from '@lace-contract/network';
import { navigationRef, StackRoutes, TabRoutes } from '@lace-lib/navigation';
import { DappExplorerPageTemplate } from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useLaceSelector } from '../../hooks/lace-context';

import { useDappExplorer } from './useDappExplorer';

import type { TabScreenProps } from '@lace-lib/navigation';

export const DappExplorer = ({}: TabScreenProps<TabRoutes.DApps>) => {
  const isAvailable = useLaceSelector(
    'network.selectIsFeatureAvailable',
    FeatureIds.DAPP_EXPLORER,
  );
  const dappExplorerProps = useDappExplorer();

  useEffect(() => {
    if (!isAvailable && navigationRef.isReady()) {
      navigationRef.navigate(StackRoutes.Home, { screen: TabRoutes.Portfolio });
    }
  }, [isAvailable]);

  if (!isAvailable) return null;

  return <DappExplorerPageTemplate {...dappExplorerProps} />;
};
