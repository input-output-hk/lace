import { HardwareWalletDiscoveryError as HardwareWalletDiscoveryErrorTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useHardwareWalletDiscoveryError } from './useHardwareWalletDiscoveryError';

export const HardwareWalletDiscoveryError = () => {
  const {
    title,
    errorCode,
    instructionText,
    detailText,
    linkText,
    cancelButtonLabel,
    onClose,
  } = useHardwareWalletDiscoveryError();

  return (
    <HardwareWalletDiscoveryErrorTemplate
      title={title}
      errorCode={errorCode}
      instructionText={instructionText}
      detailText={detailText}
      linkText={linkText}
      cancelButtonLabel={cancelButtonLabel}
      onClose={onClose}
    />
  );
};
