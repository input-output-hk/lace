import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import { useCallback } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import type { TranslationKey } from '@lace-contract/i18n';

export const useAddedAccountFailed = () => {
  const { t } = useTranslation();
  const clearActiveSheetPage = useDispatchLaceAction(
    'views.setActiveSheetPage',
  );

  const errorTitle = useLaceSelector(
    'accountManagement.getLastFailedErrorTitle',
  );
  const errorDescription = useLaceSelector(
    'accountManagement.getLastFailedErrorDescription',
  );

  const buttonAction = useCallback(() => {
    clearActiveSheetPage(null);
    NavigationControls.sheets.close();
  }, [clearActiveSheetPage]);

  const title = errorTitle
    ? t(errorTitle as TranslationKey)
    : t('v2.account-details.added-account-fail.title');
  const body = errorDescription
    ? t(errorDescription as TranslationKey)
    : t('v2.account-details.added-account-fail.description');
  const buttonText = t('v2.account-details.added-account-fail.button.close');

  return {
    title,
    body,
    buttonText,
    buttonAction,
    buttonTestID: 'added-account-fail-sheet-close-button',
    testID: 'added-account-fail-sheet',
  };
};
