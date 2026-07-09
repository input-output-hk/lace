import { AppLockSheet, Sheet } from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useLockSettings } from './useLockSettings';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const LockSettings = (
  props: SheetScreenProps<SheetRoutes.LockSettings>,
) => {
  const {
    inactivityTimeoutOptions,
    title,
    infoLabel,
    description,
    selectedLockTimeout,
    onLockTimeoutChange,
  } = useLockSettings();

  useEffect(() => {
    props.navigation.setOptions({
      header: (
        <Sheet.Header
          title={title}
          testID="app-lock-inactivity-timeout-header"
        />
      ),
    });
  }, [props.navigation, title]);

  return (
    <AppLockSheet
      description={description}
      infoLabel={infoLabel}
      lockTimeOutOptions={inactivityTimeoutOptions}
      selectedLockTimeout={selectedLockTimeout}
      onLockTimeoutChange={onLockTimeoutChange}
    />
  );
};
