import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import { useCallback } from 'react';

export const useCustomizeAccountSuccess = () => {
  const { t } = useTranslation();

  const buttonAction = useCallback(() => {
    NavigationControls.sheets.close();
  }, []);

  const title = t('v2.customise-account.success-modal.title');
  const body = t('v2.customise-account.success-modal.description');
  const buttonText = t('v2.customise-account.success-modal.confirm-text');

  return {
    title,
    body,
    buttonText,
    buttonAction,
  };
};
