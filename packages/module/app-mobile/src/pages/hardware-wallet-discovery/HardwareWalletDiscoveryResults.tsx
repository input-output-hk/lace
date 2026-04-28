import { type SheetScreenProps } from '@lace-lib/navigation';
import { HardwareWalletDiscoveryResults as HardwareWalletDiscoveryResultsTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useHardwareWalletDiscoveryResults } from './useHardwareWalletDiscoveryResults';

import type { SheetRoutes } from '@lace-lib/navigation';

export const HardwareWalletDiscoveryResults = (
  props: SheetScreenProps<SheetRoutes.HardwareWalletDiscoveryResults>,
) => {
  const { title, devices, onDeviceSelect, onClose } =
    useHardwareWalletDiscoveryResults(props);

  return (
    <HardwareWalletDiscoveryResultsTemplate
      title={title}
      devices={devices}
      onDeviceSelect={onDeviceSelect}
      onClose={onClose}
    />
  );
};
