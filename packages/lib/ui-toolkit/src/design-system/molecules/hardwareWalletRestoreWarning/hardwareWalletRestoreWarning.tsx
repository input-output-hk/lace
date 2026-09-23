import { useTranslation } from '@lace-contract/i18n';
import React from 'react';

import { WarningAlert } from '../warningAlert/warningAlert';

/**
 * Points a hardware-wallet owner at the hardware-wallet option on any screen
 * that asks for a recovery phrase.
 *
 * Owns its copy and takes no props on purpose. Typing a device phrase into
 * software forfeits the protection the device exists to give, so this must not
 * be something a caller can configure away or forget to pass.
 */
export const HardwareWalletRestoreWarning = () => {
  const { t } = useTranslation();

  return (
    <WarningAlert
      title={t('v2.recovery-phrase.hardware-wallet-warning.title')}
      body={t('v2.recovery-phrase.hardware-wallet-warning.body')}
      testID="hardware-wallet-restore-warning"
    />
  );
};
