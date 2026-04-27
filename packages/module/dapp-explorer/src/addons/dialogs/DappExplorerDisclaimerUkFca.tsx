import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { RiskWarningModal } from '@lace-lib/ui-toolkit';
import React, { useCallback } from 'react';
import { Platform } from 'react-native';

import {
  useDispatchLaceAction,
  useLaceSelector,
} from '../../hooks/lace-context';

export const DappExplorerDisclaimerUkFca: React.ComponentType = () => {
  const { t } = useTranslation();
  const isUkFcaDisclaimerAcknowledged = useLaceSelector(
    'dappExplorer.selectUkFcaDisclaimerAcknowledged',
  );
  const isAuthPromptOpen = useLaceSelector('authenticationPrompt.isOpen');

  const dispatchAcknowledge = useDispatchLaceAction(
    'dappExplorer.acknowledgeUkFcaDisclaimer',
    true,
  );
  const { trackEvent } = useAnalytics();

  const handleConfirm = useCallback(() => {
    trackEvent('dapp explorer | uk fca disclaimer | acknowledge | press');
    dispatchAcknowledge();
  }, [dispatchAcknowledge, trackEvent]);

  // UK/FCA compliance requires this notice on mobile only — the rejection from
  // Apple that motivated this work is scoped to iOS/Android, and web/extension
  // users are already subject to different disclosure flows.
  if (
    Platform.OS === 'web' ||
    isUkFcaDisclaimerAcknowledged ||
    isAuthPromptOpen
  ) {
    return null;
  }

  return (
    <RiskWarningModal
      title={t('v2.common.uk-fca-risk-warning.title')}
      body={t('v2.common.uk-fca-risk-warning.body')}
      confirmLabel={t('v2.common.uk-fca-risk-warning.confirm')}
      onConfirm={handleConfirm}
      testIdPrefix="dapp-explorer-uk-fca-risk-warning"
    />
  );
};
