import { useTranslation } from '@lace-contract/i18n';
import {
  NavigationControls,
  StackRoutes,
  TabRoutes,
} from '@lace-lib/navigation';
import { DRepDelegationSuccess, Sheet } from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect } from 'react';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const DRepDelegationSuccessSheet = (
  props: SheetScreenProps<SheetRoutes.DRepDelegationSuccess>,
) => {
  const { navigation } = props;
  const { t } = useTranslation();

  const onGoToGovernanceCenter = useCallback(() => {
    NavigationControls.navigate(StackRoutes.Home, {
      screen: TabRoutes.GovernanceCenter,
    });
  }, []);

  useEffect(() => {
    navigation.setOptions({
      header: (
        <Sheet.Header title={t('v2.governance.delegation-success.title')} />
      ),
      footer: (
        <Sheet.Footer
          primaryButton={{
            label: t('v2.governance.delegation-success.button'),
            onPress: onGoToGovernanceCenter,
            testID:
              'drep-delegation-success-sheet-go-to-governance-center-button',
          }}
        />
      ),
    });
  }, [navigation, t, onGoToGovernanceCenter]);

  return (
    <DRepDelegationSuccess onGoToGovernanceCenter={onGoToGovernanceCenter} />
  );
};
