import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import { useCallback } from 'react';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';
import type { IconName } from '@lace-lib/ui-toolkit';

interface HardwareWalletDevice {
  id: string;
  name: string;
  icon: IconName;
}

export const useHardwareWalletDiscoveryResults = (
  props: SheetScreenProps<SheetRoutes.HardwareWalletDiscoveryResults>,
) => {
  const devices = (props.route.params?.devices || []) as HardwareWalletDevice[];
  const { t } = useTranslation();

  const onDeviceSelect = useCallback((_device: HardwareWalletDevice) => {
    // TODO: Implement actual device selection logic - navigate to next step
    NavigationControls.sheets.close();
  }, []);

  const onClose = useCallback(() => {
    NavigationControls.sheets.close();
  }, []);

  const title = t('v2.hardware-wallet.results.title');

  return {
    title,
    devices,
    onDeviceSelect,
    onClose,
  };
};
