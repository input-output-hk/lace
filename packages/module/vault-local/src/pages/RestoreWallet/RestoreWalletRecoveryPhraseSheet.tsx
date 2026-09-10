import {
  RestoreWalletRecoverySheetTemplate,
  Sheet,
} from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useRestoreWalletRecoveryPhraseSheet } from './useRestoreWalletRecoveryPhraseSheet';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const RestoreWalletRecoveryPhraseSheet = (
  props: SheetScreenProps<SheetRoutes.RestoreWalletRecoveryPhrase>,
) => {
  const templateProps = useRestoreWalletRecoveryPhraseSheet(props);

  useEffect(() => {
    props.navigation.setOptions({
      header: (
        <Sheet.Header
          title={templateProps.title}
          testID="restore-wallet-recovery-sheet-header"
        />
      ),
    });
  }, [props.navigation, templateProps.title]);

  return <RestoreWalletRecoverySheetTemplate {...templateProps} />;
};

export default RestoreWalletRecoveryPhraseSheet;
