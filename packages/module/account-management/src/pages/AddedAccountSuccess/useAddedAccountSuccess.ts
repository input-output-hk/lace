import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import {
  NavigationControls,
  StackRoutes,
  TabRoutes,
} from '@lace-lib/navigation';
import { useCallback, useEffect } from 'react';

import { useDispatchLaceAction } from '../../hooks';

import type { IconName } from '@lace-lib/ui-toolkit';

type IconProps = {
  name: IconName;
  variant?: 'solid' | 'stroke';
};

export const useAddedAccountSuccess = () => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const clearActiveSheetPage = useDispatchLaceAction(
    'views.setActiveSheetPage',
  );

  useEffect(() => {
    trackEvent('account management | account | added');
  }, [trackEvent]);

  const buttonAction = useCallback(() => {
    clearActiveSheetPage(null);
    NavigationControls.actions.closeAndNavigate(StackRoutes.Home, {
      screen: TabRoutes.AccountCenter,
    });
  }, [clearActiveSheetPage]);

  const title = t('v2.account-details.added-account-success.title');
  const body = t('v2.account-details.added-account-success.description');
  const buttonText = t('v2.account-details.added-account-success.button.close');

  const icon: IconProps = { name: 'RelievedFace', variant: 'solid' };

  return {
    title,
    body,
    buttonText,
    buttonAction,
    testID: 'added-account-success-sheet',
    buttonTestID: 'added-account-success-sheet-close-button',
    icon,
  };
};
