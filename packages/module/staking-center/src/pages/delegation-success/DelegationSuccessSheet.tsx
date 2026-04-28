import {
  NavigationControls,
  StackRoutes,
  TabRoutes,
} from '@lace-lib/navigation';
import { DelegationSuccess } from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect } from 'react';

import { useDispatchLaceAction } from '../../hooks';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const DelegationSuccessSheet = (
  _props: SheetScreenProps<SheetRoutes.DelegationSuccess>,
) => {
  const resetDelegationFlow = useDispatchLaceAction('delegationFlow.reset');

  useEffect(() => {
    return () => {
      resetDelegationFlow();
    };
  }, [resetDelegationFlow]);

  const handleGoToStakingCenter = useCallback(() => {
    NavigationControls.actions.closeAndNavigate(StackRoutes.Home, {
      screen: TabRoutes.StakingCenter,
    });
  }, []);

  return <DelegationSuccess onGoToStakingCenter={handleGoToStakingCenter} />;
};
