import {
  NavigationControls,
  StackRoutes,
  TabRoutes,
} from '@lace-lib/navigation';
import { DeregistrationSuccess } from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect } from 'react';

import { useDispatchLaceAction } from '../../hooks';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const DeregistrationSuccessSheet = (
  _props: SheetScreenProps<SheetRoutes.DeregistrationSuccess>,
) => {
  const resetDeregistrationFlow = useDispatchLaceAction(
    'deregistrationFlow.reset',
  );

  useEffect(() => {
    return () => {
      resetDeregistrationFlow();
    };
  }, [resetDeregistrationFlow]);

  const handleGoToStakingCenter = useCallback(() => {
    NavigationControls.actions.closeAndNavigate(StackRoutes.Home, {
      screen: TabRoutes.StakingCenter,
    });
  }, []);

  return (
    <DeregistrationSuccess onGoToStakingCenter={handleGoToStakingCenter} />
  );
};
