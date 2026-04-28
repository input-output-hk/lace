import { useConfig } from '@lace-contract/app';
import { Trans, useTranslation } from '@lace-contract/i18n';
import { ExternalLink } from '@lace-lib/ui-extension';
import { Modal } from '@lace-lib/ui-toolkit';
import React, { useState } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../../hooks';

export const MidnightDisclaimer: React.ComponentType = () => {
  const { t } = useTranslation();
  const { appConfig } = useConfig();
  const [isAcknowledging, setIsAcknowledging] = useState<boolean>(false);
  const shouldAcknowledgeMidnightDisclaimer = useLaceSelector(
    'midnightContext.selectShouldAcknowledgeMidnightDisclaimer',
  );
  const isAuthPromptOpen = useLaceSelector('authenticationPrompt.isOpen');
  const setShouldAcknowledgeMidnightDisclaimer = useDispatchLaceAction(
    'midnightContext.setShouldAcknowledgeMidnightDisclaimer',
  );
  const networkTermsAndConditions = useLaceSelector(
    'midnightContext.selectNetworkTermsAndConditions',
  );

  if (
    isAuthPromptOpen ||
    shouldAcknowledgeMidnightDisclaimer !== 'shown' ||
    isAcknowledging
  )
    return null;

  if (!appConfig) {
    return null;
  }

  const midnightGlobalTermsUrl =
    networkTermsAndConditions?.url ||
    appConfig.midnightGlobalTermsAndConditionsUrl;

  return (
    <Modal
      heading={t('midnight.disclaimer.modal.title')}
      confirmText={t('v2.action-prompt-card.understood')}
      testIdPrefix={'midnight-disclaimer'}
      description={
        <Trans
          i18nKey={'midnight.disclaimer.modal.description'}
          components={{
            Text: <p key="text" />,
            LaceTerms: (
              <ExternalLink
                key="lace-terms"
                href={appConfig?.laceTermsOfUseUrl || ''}
              />
            ),
            MidnightGlobalTerms: (
              <ExternalLink
                key="midnight-global-terms"
                href={midnightGlobalTermsUrl}
              />
            ),
          }}
        />
      }
      onConfirm={() => {
        setIsAcknowledging(true);
        setShouldAcknowledgeMidnightDisclaimer('acknowledged');
      }}
    />
  );
};
