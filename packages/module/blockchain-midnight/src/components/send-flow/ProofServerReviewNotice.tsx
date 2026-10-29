import { useTranslation } from '@lace-contract/i18n';
import { WarningAlert } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useLaceSelector } from '../../hooks/lace-context';

export const ProofServerReviewNotice = () => {
  const { t } = useTranslation();
  const { config } = useLaceSelector('midnightContext.selectCurrentNetwork');
  const mode = config.proofServer;

  if (mode.kind === 'in-process') {
    return (
      <WarningAlert
        title={t('midnight.proof-server.in-process.label')}
        body={t('midnight.proof-server.in-process.description')}
        testID="proof-server-review-notice"
      />
    );
  }

  if (mode.kind === 'local-host') {
    return (
      <WarningAlert
        title={t('midnight.proof-server.local-host.label')}
        body={t('midnight.proof-server.custom.transaction-notice')}
        testID="proof-server-review-notice"
      />
    );
  }

  if (mode.kind !== 'delegated' && mode.kind !== 'tee-delegated') return null;

  return (
    <WarningAlert
      title={t('midnight.proof-server.transaction-notice-title')}
      body={t('midnight.proof-server.transaction-notice', {
        provider: mode.label,
      })}
      testID="proof-server-review-notice"
    />
  );
};
