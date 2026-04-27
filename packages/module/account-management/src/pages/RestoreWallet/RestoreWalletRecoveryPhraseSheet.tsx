import { RestoreWalletRecoverySheetTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useRestoreWalletRecoveryPhraseSheet } from './useRestoreWalletRecoveryPhraseSheet';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const RestoreWalletRecoveryPhraseSheet = (
  props: SheetScreenProps<SheetRoutes.RestoreWalletRecoveryPhrase>,
) => {
  const templateProps = useRestoreWalletRecoveryPhraseSheet(props);

  return <RestoreWalletRecoverySheetTemplate {...templateProps} />;
};

export default RestoreWalletRecoveryPhraseSheet;
