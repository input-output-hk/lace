import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { Modal } from '@lace-lib/ui-toolkit';
import React, { useCallback } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

export const SwapDisclaimer: React.ComponentType = () => {
  const { t } = useTranslation();
  const isSwapDisclaimerAcknowledged = useLaceSelector(
    'swapConfig.selectDisclaimerAcknowledged',
  );
  const isAuthPromptOpen = useLaceSelector('authenticationPrompt.isOpen');

  const dispatchAcknowledge = useDispatchLaceAction(
    'swapConfig.acknowledgeDisclaimer',
    true,
  );
  const { trackEvent } = useAnalytics();

  const handleConfirm = useCallback(() => {
    trackEvent('swaps | disclaimer | acknowledge | press');
    dispatchAcknowledge();
  }, [dispatchAcknowledge, trackEvent]);

  if (isSwapDisclaimerAcknowledged || isAuthPromptOpen) {
    return null;
  }

  return (
    <Modal
      heading={t('v2.swap.disclaimer.title')}
      description={t('v2.swap.disclaimer.body')}
      onConfirm={handleConfirm}
    />
  );
};
