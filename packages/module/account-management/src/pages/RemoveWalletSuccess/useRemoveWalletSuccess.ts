import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import {
  NavigationControls,
  StackRoutes,
  TabRoutes,
} from '@lace-lib/navigation';
import { useCallback, useEffect } from 'react';

import { useDispatchLaceAction } from '../../hooks';

export const useRemoveWalletSuccess = () => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const clearActiveSheetPage = useDispatchLaceAction(
    'views.setActiveSheetPage',
  );

  useEffect(() => {
    trackEvent('account management | wallet | deleted');
  }, [trackEvent]);

  const buttonAction = useCallback(() => {
    clearActiveSheetPage(null);
    NavigationControls.actions.closeAndNavigate(StackRoutes.Home, {
      screen: TabRoutes.AccountCenter,
    });
  }, [clearActiveSheetPage]);

  const title = t('v2.wallet-settings.remove-success.title');
  const body = t('v2.wallet-settings.remove-success.body');
  const buttonText = t('v2.wallet-settings.remove-success.button');

  return {
    title,
    body,
    buttonText,
    buttonAction,
  };
};
