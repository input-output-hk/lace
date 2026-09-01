import {
  NavigationControls,
  StackRoutes,
  TabRoutes,
} from '@lace-lib/navigation';
import { DRepDelegationSuccess } from '@lace-lib/ui-toolkit';
import React, { useCallback } from 'react';

export const DRepDelegationSuccessSheet = () => {
  const onGoToGovernanceCenter = useCallback(() => {
    NavigationControls.navigate(StackRoutes.Home, {
      screen: TabRoutes.GovernanceCenter,
    });
  }, []);

  return (
    <DRepDelegationSuccess onGoToGovernanceCenter={onGoToGovernanceCenter} />
  );
};
