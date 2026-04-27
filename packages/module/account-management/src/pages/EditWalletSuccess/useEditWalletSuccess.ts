import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import { useCallback } from 'react';

import type { IconName } from '@lace-lib/ui-toolkit';

type IconProps = {
  name: IconName;
  variant?: 'solid' | 'stroke';
  size?: number;
};

export const useEditWalletSuccess = () => {
  const { t } = useTranslation();

  const buttonAction = useCallback(() => {
    NavigationControls.sheets.close();
  }, []);

  const title = t('v2.wallet-settings.edit-wallet-success.title');
  const body = t('v2.wallet-settings.edit-wallet-success.body');
  const buttonText = t('v2.wallet-settings.edit-wallet-success.button');

  const icon: IconProps = { name: 'RelievedFace', variant: 'solid' };

  return {
    title,
    body,
    buttonText,
    buttonAction,
    icon,
  };
};
