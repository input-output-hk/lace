import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import { useCallback } from 'react';

import type { IconName } from '@lace-lib/ui-toolkit';

export const useSuccessRecoveryPhraseVerification = () => {
  const { t } = useTranslation();

  const handleButtonAction = useCallback(() => {
    NavigationControls.sheets.close();
  }, []);

  const title = t('v2.recovery-phrase.verification.success.title');
  const body = t('v2.recovery-phrase.verification.success.body');
  const image: IconName = 'RelievedFace';
  const buttonText = t('v2.recovery-phrase.verification.success.button');

  return {
    title,
    body,
    image,
    buttonText,
    buttonAction: handleButtonAction,
  };
};
