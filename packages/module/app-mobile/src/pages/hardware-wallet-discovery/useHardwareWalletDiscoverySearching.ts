import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import { useCallback } from 'react';

export const useHardwareWalletDiscoverySearching = () => {
  const { t } = useTranslation();

  const onCancel = useCallback(() => {
    NavigationControls.sheets.close();
  }, []);

  // TODO: Should add a logic here to start discovery and navigate to results page

  const title = t('v2.hardware-wallet.searching.title');
  const statusText = t('v2.hardware-wallet.searching.pleaseWait');
  const instructionText = t('v2.hardware-wallet.searching.ensureConnected');
  const detailText = t('v2.hardware-wallet.searching.instruction');
  const linkText = t('v2.hardware-wallet.searching.here');
  const cancelButtonLabel = 'Cancel';

  return {
    title,
    statusText,
    instructionText,
    detailText,
    linkText,
    cancelButtonLabel,
    onCancel,
  };
};
