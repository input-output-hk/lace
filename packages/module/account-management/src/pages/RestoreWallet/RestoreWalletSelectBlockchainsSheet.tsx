import {
  RestoreWalletSelectBlockchainsSheetTemplate,
  Sheet,
} from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useRestoreWalletSelectBlockchainsSheet } from './useRestoreWalletSelectBlockchainsSheet';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const RestoreWalletSelectBlockchainsSheet = (
  props: SheetScreenProps<SheetRoutes.RestoreWalletSelectBlockchains>,
) => {
  const templateProps = useRestoreWalletSelectBlockchainsSheet(props);
  const {
    title,
    onBack,
    confirmLabel,
    onConfirm,
    isConfirmDisabled,
    isLoading,
    confirmTestID,
    ...bodyProps
  } = templateProps;

  useEffect(() => {
    props.navigation.setOptions({
      header: (
        <Sheet.Header
          title={title}
          leftIconOnPress={onBack}
          testID="restore-wallet-select-blockchains-sheet-header"
        />
      ),
      footer: (
        <Sheet.Footer
          primaryButton={{
            label: confirmLabel,
            onPress: onConfirm,
            disabled: isConfirmDisabled,
            loading: isLoading,
            testID: confirmTestID,
          }}
        />
      ),
    });
  }, [
    props.navigation,
    title,
    onBack,
    confirmLabel,
    onConfirm,
    isConfirmDisabled,
    isLoading,
    confirmTestID,
  ]);

  return <RestoreWalletSelectBlockchainsSheetTemplate {...bodyProps} />;
};

export default RestoreWalletSelectBlockchainsSheet;
