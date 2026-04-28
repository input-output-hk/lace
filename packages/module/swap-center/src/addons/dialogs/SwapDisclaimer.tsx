import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { Modal } from '@lace-lib/ui-toolkit';
import React, { useCallback } from 'react';
import { Platform } from 'react-native';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

export const SwapDisclaimer: React.ComponentType = () => {
  const { t } = useTranslation();
  const isSwapDisclaimerAcknowledged = useLaceSelector(
    'swapConfig.selectDisclaimerAcknowledged',
  );
  // The UK/FCA risk-warning must be acknowledged before the product
  // disclaimer is shown, so on mobile this component waits until the FCA
  // flag is set. Extension/web users skip the FCA step (see
  // SwapDisclaimerUkFca) and the flag stays false, so we only gate when
  // the FCA flag has not been acknowledged AND the user is on mobile; on
  // web the FCA flag being false must NOT block the product disclaimer.
  const isUkFcaAcknowledged = useLaceSelector(
    'swapConfig.selectUkFcaDisclaimerAcknowledged',
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
  // On mobile, the UK/FCA risk warning renders first; keep this modal
  // hidden until the user has acknowledged it.
  if (Platform.OS !== 'web' && !isUkFcaAcknowledged) {
    return null;
  }

  return (
    <Modal
      heading={t('v2.swap.disclaimer.title')}
      description={t('v2.swap.disclaimer.body')}
      onConfirm={handleConfirm}
      testIdPrefix="swap-disclaimer"
    />
  );
};
