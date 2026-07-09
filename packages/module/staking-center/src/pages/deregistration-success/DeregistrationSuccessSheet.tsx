import { useTranslation } from '@lace-contract/i18n';
import {
  NavigationControls,
  StackRoutes,
  TabRoutes,
} from '@lace-lib/navigation';
import { DeregistrationSuccess, Sheet } from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect } from 'react';

import { useDispatchLaceAction } from '../../hooks';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const DeregistrationSuccessSheet = (
  props: SheetScreenProps<SheetRoutes.DeregistrationSuccess>,
) => {
  const { t } = useTranslation();
  const resetDeregistrationFlow = useDispatchLaceAction(
    'deregistrationFlow.reset',
  );

  useEffect(() => {
    return () => {
      resetDeregistrationFlow();
    };
  }, [resetDeregistrationFlow]);

  const handleGoToStakingCenter = useCallback(() => {
    NavigationControls.navigate(StackRoutes.Home, {
      screen: TabRoutes.StakingCenter,
    });
  }, []);

  useEffect(() => {
    props.navigation.setOptions({
      header: (
        <Sheet.Header
          title={t('v2.generic.staking.deregistration-success.title')}
        />
      ),
      footer: (
        <Sheet.Footer
          primaryButton={{
            label: t('v2.generic.staking.deregistration-success.button'),
            onPress: handleGoToStakingCenter,
            testID: 'deregistration-success-sheet-go-to-staking-center-button',
          }}
        />
      ),
    });
  }, [props.navigation, t, handleGoToStakingCenter]);

  return (
    <DeregistrationSuccess onGoToStakingCenter={handleGoToStakingCenter} />
  );
};
