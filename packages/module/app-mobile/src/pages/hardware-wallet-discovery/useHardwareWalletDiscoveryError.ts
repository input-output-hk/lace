import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import { useCallback } from 'react';

export const useHardwareWalletDiscoveryError = () => {
  const { t } = useTranslation();

  const onClose = useCallback(() => {
    NavigationControls.sheets.close();
  }, []);

  const title = t('v2.hardware-wallet.error.title');
  // TODO: Replace with actual error code from hardware wallet discovery
  const errorCode = '101'; // This would come from the actual error
  const instructionText = t('v2.hardware-wallet.error.ensureConnected');
  const detailText = t('v2.hardware-wallet.error.instruction');
  const linkText = t('v2.hardware-wallet.error.here');
  const cancelButtonLabel = 'Cancel';

  return {
    title,
    errorCode,
    instructionText,
    detailText,
    linkText,
    cancelButtonLabel,
    onClose,
  };
};
