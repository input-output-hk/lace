import { useTranslation } from '@lace-contract/i18n';
import {
  NavigationControls,
  StackRoutes,
  TabRoutes,
} from '@lace-lib/navigation';
import { DelegationSuccess, Sheet } from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect } from 'react';

import { useDispatchLaceAction } from '../../hooks';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const DelegationSuccessSheet = (
  props: SheetScreenProps<SheetRoutes.DelegationSuccess>,
) => {
  const { t } = useTranslation();
  const resetDelegationFlow = useDispatchLaceAction('delegationFlow.reset');

  useEffect(() => {
    return () => {
      resetDelegationFlow();
    };
  }, [resetDelegationFlow]);

  const handleGoToStakingCenter = useCallback(() => {
    NavigationControls.navigate(StackRoutes.Home, {
      screen: TabRoutes.StakingCenter,
    });
  }, []);

  useEffect(() => {
    props.navigation.setOptions({
      header: (
        <Sheet.Header
          title={t('v2.generic.staking.delegation-success.title')}
        />
      ),
      footer: (
        <Sheet.Footer
          primaryButton={{
            label: t('v2.generic.staking.delegation-success.button'),
            onPress: handleGoToStakingCenter,
            testID: 'delegation-success-sheet-go-to-staking-center-button',
          }}
        />
      ),
    });
  }, [props.navigation, t, handleGoToStakingCenter]);

  return <DelegationSuccess onGoToStakingCenter={handleGoToStakingCenter} />;
};
