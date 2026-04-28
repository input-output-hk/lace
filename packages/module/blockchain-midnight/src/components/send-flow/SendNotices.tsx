import { useTranslation } from '@lace-contract/i18n';
import { Text } from '@lace-lib/ui-toolkit';
import React from 'react';

import {
  useShouldShowDesignationWarning,
  useShouldShowPrivacyNotice,
} from '../../hooks/index';

/**
 * Midnight-specific notices for the send sheet:
 * - Designation notice: when sending designated NIGHT tokens
 * - Privacy notice: when sending shielded tokens or to a shielded address
 */
export const SendNotices = () => {
  const { t } = useTranslation();
  const shouldShowDesignation = useShouldShowDesignationWarning();
  const shouldShowPrivacy = useShouldShowPrivacyNotice();

  if (!shouldShowDesignation && !shouldShowPrivacy) {
    return null;
  }

  return (
    <>
      {shouldShowPrivacy && (
        <Text.S variant="secondary" testID="send-form-privacy-notice">
          {t('v2.send-flow.form.shielded-token-privacy-notice')}
        </Text.S>
      )}
      {shouldShowDesignation && (
        <Text.S variant="secondary" testID="send-form-designation-notice">
          {t('v2.midnight.send-flow.form.designation-notice')}
        </Text.S>
      )}
    </>
  );
};
