import { AppLockSheet } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useLockSettings } from './useLockSettings';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const LockSettings = (
  _props: SheetScreenProps<SheetRoutes.LockSettings>,
) => {
  const {
    inactivityTimeoutOptions,
    title,
    infoLabel,
    description,
    selectedLockTimeout,
    onLockTimeoutChange,
  } = useLockSettings();

  return (
    <AppLockSheet
      title={title}
      description={description}
      infoLabel={infoLabel}
      lockTimeOutOptions={inactivityTimeoutOptions}
      selectedLockTimeout={selectedLockTimeout}
      onLockTimeoutChange={onLockTimeoutChange}
    />
  );
};
