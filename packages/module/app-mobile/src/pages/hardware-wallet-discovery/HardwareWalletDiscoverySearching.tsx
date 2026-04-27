import { HardwareWalletDiscoverySearching as HardwareWalletDiscoverySearchingTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useHardwareWalletDiscoverySearching } from './useHardwareWalletDiscoverySearching';

export const HardwareWalletDiscoverySearching = () => {
  const {
    title,
    statusText,
    instructionText,
    detailText,
    linkText,
    cancelButtonLabel,
    onCancel,
  } = useHardwareWalletDiscoverySearching();

  return (
    <HardwareWalletDiscoverySearchingTemplate
      title={title}
      statusText={statusText}
      instructionText={instructionText}
      detailText={detailText}
      linkText={linkText}
      cancelButtonLabel={cancelButtonLabel}
      onCancel={onCancel}
    />
  );
};
