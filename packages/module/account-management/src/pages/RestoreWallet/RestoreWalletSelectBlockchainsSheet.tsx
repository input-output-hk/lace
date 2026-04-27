import { RestoreWalletSelectBlockchainsSheetTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useRestoreWalletSelectBlockchainsSheet } from './useRestoreWalletSelectBlockchainsSheet';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const RestoreWalletSelectBlockchainsSheet = (
  props: SheetScreenProps<SheetRoutes.RestoreWalletSelectBlockchains>,
) => {
  const templateProps = useRestoreWalletSelectBlockchainsSheet(props);

  return <RestoreWalletSelectBlockchainsSheetTemplate {...templateProps} />;
};

export default RestoreWalletSelectBlockchainsSheet;
